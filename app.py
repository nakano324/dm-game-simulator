from dm_core import create_initial_game, take_turn_ai, play_card_for_ai, RuleBasedAI, Card, GameState, play_as_creature, play_as_spell, start_turn, ai, attack_target
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import time

app = Flask(__name__)
# CORS設定を改善
CORS(app, 
     resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"], 
                           "methods": ["GET", "POST", "OPTIONS"],
                           "allow_headers": ["Content-Type", "Authorization"]}}, 
     supports_credentials=True)

# グローバル変数としてゲーム状態を保持
game = None

def add_cors_headers(response):
    """CORSヘッダーをレスポンスに追加するヘルパー関数"""
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/<path:subpath>', methods=['OPTIONS'])
def handle_options(subpath):
    """OPTIONSリクエストを処理する"""
    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

def get_or_create_game():
    """ゲーム状態を取得または作成する"""
    global game
    if game is None:
        game = create_initial_game()
        print("[DEBUG] ゲーム初期化完了")
    return game

@app.route('/api/drop_card', methods=['POST'])
def drop_card():
    game = get_or_create_game()
    data = request.get_json()
    card_id = data.get('cardId')
    zone = data.get('zone')
    player = game.players[game.turn_player]

    print(f"[DEBUG][SERVER] drop_card called with zone={zone!r}, cardId={card_id!r}")

        # ▼ここから追加！！（not cardの直前）
    card_ids_in_hand = [c.id for c in player.hand]
    print(f"[DEBUG][SERVER] player.hand ids: {card_ids_in_hand}")
    print(f"[DEBUG][SERVER] 受信card_id: {card_id!r}")

    # 手札から対象カードを取得
    card = next((c for c in player.hand if c.id == card_id), None)
    if not card:
        print(f"[DEBUG][SERVER] player.hand ids: {[c.id for c in player.hand]}")
        print(f"[DEBUG][SERVER] received card_id: {card_id!r}")
        response = jsonify({
            'error': 'Card not found',
            'hand': [c.to_dict() for c in player.hand],
            'used_mana_this_turn': getattr(player, 'used_mana_this_turn', False),
            'mana_zone': [c.to_dict() for c in player.mana_zone],
        })
        return add_cors_headers(response), 404

    # バトルゾーンに置く場合
    if zone == 'battle':
        # ■ ツインパクト選択処理
        if getattr(card, 'card_type', None) == "twimpact":
            if not game.pending_choice:
                game.pending_choice         = True
                game.pending_choice_player  = game.turn_player
                game.choice_candidates      = [card]
                game.choice_purpose         = "twimpact_mode"
            response = jsonify({'status': 'pending_twimpact_choice'})
            return add_cors_headers(response)

        # ■ クリーチャー or 呪文どちらで使うか判定（spellなら直接墓地/効果に行く前提）
        is_spell = getattr(card, 'card_type', None) == "spell"
        
        # 文明チェック
        if not any(
            civ in [civ for mana_card in player.mana_zone for civ in mana_card.civilizations]
            for civ in card.civilizations
        ):
            response = jsonify({'error': 'not enough civilization'})
            return add_cors_headers(response), 400

        # マナコストチェック
        if card.cost > player.available_mana:
            response = jsonify({'error': 'not enough mana'})
            return add_cors_headers(response), 400

        # マナを支払って手札からカードを取り出す
        player.available_mana -= card.cost
        player.used_mana_this_turn = True
        card = player.hand.pop(player.hand.index(card))

        if is_spell:
            # 呪文として使用
            from dm_core import cast_spell
            cast_spell(player, card, from_effect=False)
            last_played_card = card.to_dict()
        else:
            # クリーチャーとして使用
            from dm_core import summon_creature_to_battle_zone
            summon_creature_to_battle_zone(player, card, card, from_effect=False)
            last_played_card = player.battle_zone[-1].to_dict()

        # デドダム効果の選択待ち（手札⇔マナ振り分け）
        if getattr(game, 'pending_choice', False) and game.choice_purpose in ('hand', 'mana'):
            response = jsonify({
                'status': 'pending_dedodam_choice',
                'choice_candidates': [c.to_dict() for c in game.choice_candidates],
                'choice_purpose': game.choice_purpose
            })
            return add_cors_headers(response)

        response = jsonify({
            'status': 'ok',
            'last_played_card': last_played_card
        })
        return add_cors_headers(response)

    # マナゾーンに置く場合
    elif zone == 'mana':
        if getattr(player, 'used_mana_this_turn', False):
            response = jsonify({'error': 'Mana already charged this turn'})
            return add_cors_headers(response), 400
        player.hand.remove(card)
        player.mana_zone.append(card)
        player.used_mana_this_turn = True
        if hasattr(card, 'civilizations') and len(card.civilizations) == 1:
            player.available_mana += 1
        response = jsonify({
            'status': 'ok',
            'last_played_card': card.to_dict()
        })
        return add_cors_headers(response)

    # その他のゾーン不明
    else:
        response = jsonify({'error': f'Unknown zone: {zone}'})
        return add_cors_headers(response), 400

@app.route('/api/choose_card', methods=['POST'])
def choose_card():
    game = get_or_create_game()
    print("[choose_card]",
          "pending_choice:", game.pending_choice,
          "pending_choice_player:", getattr(game, 'pending_choice_player', None),
          "purpose:",           getattr(game, 'choice_purpose', None),
          "candidates:",        [c.name for c in getattr(game, 'choice_candidates', [])])

    if not getattr(game, 'pending_choice', False):
        response = jsonify({'error': 'no pending choice'})
        return add_cors_headers(response), 400

    data      = request.get_json() or {}
    card_id   = data.get('card_id')
    purpose   = data.get('purpose')
    # フェーズ①（dedodam）では purpose が "hand"/"mana"、
    # フェーズ②（maruru second）では purpose が "hand_or_mana"、
    # それ以外のときは zone=None で OK
    zone      = data.get('zone') or purpose
    candidates = getattr(game, 'choice_candidates', [])
    selected   = next((c for c in candidates if c.id == card_id), None)
    if not selected:
        response = jsonify({'error': 'card not found'})
        return add_cors_headers(response), 400

    player = game.players[game.turn_player]

    def clear_pending():
        game.pending_choice        = False
        game.choice_candidates     = []
        game.choice_purpose        = None
        game.pending_choice_player = None

    # ── フェーズ①：デドダム効果（山札上3枚振り分け） ──
    if game.dedodam_state:
        top_cards = game.dedodam_state["top_three"]

        # ── 第1選択：3枚から手札へ ──
        if len(top_cards) == 3 and zone == "hand":
            player.hand.append(selected)
            # 残り2枚を次のマナ振りフェーズへ
            remaining = [c for c in top_cards if c.id != card_id]
            game.dedodam_state["top_three"]     = remaining
            game.pending_choice                = True
            game.pending_choice_player         = game.turn_player
            game.choice_candidates             = remaining.copy()
            game.choice_purpose                = "mana"
            response = jsonify({'status': 'pending_mana'})
            return add_cors_headers(response)

        # ── 第2選択：2枚からマナへ（残り1枚は自動的に墓地へ） ──
        if len(top_cards) == 2 and zone == "mana":
            player.mana_zone.append(selected)
            # 残り1枚を墓地へ
            last = next(c for c in top_cards if c.id != card_id)
            player.graveyard.append(last)
            # クリーンアップ
            game.dedodam_state        = None
            clear_pending()
            response = jsonify({'status': 'ok'})
            return add_cors_headers(response)

        # ── 想定外ルート：選択されたカードを墓地へ ──
        player.graveyard.append(selected)
        game.dedodam_state = None
        clear_pending()
        response = jsonify({'status': 'ok'})
        return add_cors_headers(response)

    # ── フェーズ②：マルル二段階目効果の選択処理 ──
    if purpose == "hand_or_mana":
        if zone == "hand":
            player.hand.append(selected)
        else:
            player.mana_zone.append(selected)
        clear_pending()
        response = jsonify({'status': 'ok'})
        return add_cors_headers(response)
    
    if purpose == "twimpact_mode":
        mode = data.get("mode")
        if mode not in ("creature", "spell"):
            clear_pending()
            response = jsonify({'error': 'invalid mode'})
            return add_cors_headers(response), 400

        idx = next((i for i, c in enumerate(player.hand) if c.id == card_id), None)
        if idx is None:
            clear_pending()
            response = jsonify({'error': 'card not found in hand'})
            return add_cors_headers(response), 400

        try:
            if mode == "creature":
                play_as_creature(player, player.hand[idx], idx)
                last_played_card = player.battle_zone[-1].to_dict()
            else:
                play_as_spell(player, player.hand[idx], idx)
                last_played_card = player.graveyard[-1].to_dict()
        except Exception as e:
            print(f"[ERROR] twimpact_mode: {e}")
            clear_pending()
            response = jsonify({'error': str(e)})
            return add_cors_headers(response), 500

        clear_pending()
        response = jsonify({
            'status': 'ok',
            'last_played_card': last_played_card
        })
        return add_cors_headers(response)

    # その他の選択処理
    clear_pending()
    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

@app.route('/api/set_mana', methods=['POST'])
def set_mana():
    game = get_or_create_game()
    data = request.get_json()
    card_id = data.get('cardId')
    player = game.players[game.turn_player]
    
    # 手札から対象カードを取得
    card = next((c for c in player.hand if c.id == card_id), None)
    if not card:
        response = jsonify({'error': 'Card not found'})
        return add_cors_headers(response), 404
    
    # マナゾーンに移動
    player.hand.remove(card)
    player.mana_zone.append(card)
    player.used_mana_this_turn = True
    
    # マナを増加
    if hasattr(card, 'civilizations') and len(card.civilizations) == 1:
        player.available_mana += 1

    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

@app.route('/api/state', methods=['GET'])
def get_state():
    game = get_or_create_game()
    # 自分（常にplayer1=0）視点
    me = game.players[0]
    opponent = game.players[1]

    # ここでターン開始処理
    if game.turn_player == 0 and not game.turn_started:
        start_turn(game)
        game.turn_started = True

        me = game.players[0]
        opponent = game.players[1]

    def zone_to_list(zone, attacked_creatures=None):
        return [card.to_dict(attacked_creatures=attacked_creatures) for card in zone]
    
    print("[DEBUG] me.hand の中身:", [card.name for card in me.hand])
    print("[DEBUG][API/state直前] AIのbattle_zone:", [card.name for card in opponent.battle_zone])
    print("[DEBUG][API/state直前] AIのhand:", [card.name for card in opponent.hand])
    print("[DEBUG][API/state直前] AIのmana_zone:", [card.name for card in opponent.mana_zone])

    data = {
        'battle_zone': zone_to_list(me.battle_zone, attacked_creatures=me.attacked_creatures),
        'hand': zone_to_list(me.hand),
        'mana_zone': zone_to_list(me.mana_zone),
        'available_mana': me.available_mana,
        'shield_zone': zone_to_list(me.shields),
        'graveyard': zone_to_list(me.graveyard),
        'deck': zone_to_list(me.deck),
        'deck_count': len(me.deck),

        'opponent_battle_zone': zone_to_list(opponent.battle_zone, attacked_creatures=opponent.attacked_creatures),
        'opponent_shield_zone': zone_to_list(opponent.shields),
        'opponent_available_mana': opponent.available_mana,
        'opponent_mana_zone': zone_to_list(opponent.mana_zone),
        'opponent_graveyard': zone_to_list(opponent.graveyard),
        'opponent_deck': zone_to_list(opponent.deck),
        'opponent_deck_count': len(opponent.deck),
        'opponent_hand_count': len(opponent.hand),
        'turn_player': game.turn_player,
        'turn_count': game.turn_count,
        'must_end_turn': False,
        'used_mana_this_turn': me.used_mana_this_turn,
    }

    # ★ pending_choice時は候補カード等も返す
    print("[get_state] pending_choice:", getattr(game, 'pending_choice', False))

    # pending_choice_player==0 のときだけ返す
    if getattr(game, 'pending_choice', False) and getattr(game, 'pending_choice_player', 0) == 0:
        data['pending_choice'] = True
        data['choice_candidates'] = [c.to_dict() for c in getattr(game, 'choice_candidates', [])]
        data['choice_purpose'] = getattr(game, 'choice_purpose', '')
    else:
        data['pending_choice'] = False
    
    # CORSヘッダーを明示的に設定
    response = jsonify(data)
    return add_cors_headers(response)

@app.route('/api/end_turn', methods=['POST'])
def end_turn_api():
    from manual_debug import end_turn
    end_turn(game)
    current_player = game.players[game.turn_player]
    if getattr(current_player, "is_ai", False):
        # ここでAIターンに突入したことだけ返し、「AIの行動は後から行う」方式にする
        # → 一時的にAI行動をスキップ
        response = jsonify({'status': 'ai_turn'})
        return add_cors_headers(response)
    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

# Flask 側
@app.route('/api/ai_take_turn', methods=['POST'])
def ai_take_turn():
    from manual_debug import end_turn
    # 1. ドローだけ実行
    player = game.players[game.turn_player]
    start_turn(game)
    game.turn_started = True
    time.sleep(0.8)
    # 2. マナチャージ
    ai.choose_mana_card(game)
    time.sleep(0.8)
    # 3. プレイ
    ai.play_cards(game)
    time.sleep(0.8)
    # 4. 攻撃
    ai.attack(game)
    time.sleep(0.8)
    # 5. エンド
    end_turn(game)
    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

@app.route("/api/attack", methods=["POST"])
def attack():
    data = request.json
    attacker_id = data.get("attackerId")
    target_id = data.get("targetId")

    print(f"攻撃処理：{attacker_id} -> {target_id}")

    # TODO: attacker_id と target_id を使って攻撃処理を行う
    # - 攻撃対象がバトルゾーンのクリーチャーならバトル処理
    # - 攻撃対象がシールドならブレイク処理

    response = jsonify(success=True)
    return add_cors_headers(response)

@app.route("/api/attack", methods=["POST"])
def attack_api():
    data = request.json
    attacker_id = data.get("attackerId")
    target_id = data.get("targetId")
    player = game.players[game.turn_player]
    opponent = game.players[1 - game.turn_player]

    # 攻撃元・攻撃対象のカードオブジェクト取得
    attacker = next((c for c in player.battle_zone if c.id == attacker_id), None)
    target = None
    if target_id in [c.id for c in opponent.battle_zone]:
        target = next((c for c in opponent.battle_zone if c.id == target_id), None)
    elif target_id in [c.id for c in opponent.shields]:
        target = next((c for c in opponent.shields if c.id == target_id), None)

    if not attacker:
        response = jsonify(success=False, message="攻撃元カードが見つかりません")
        return add_cors_headers(response), 400

    # クリーチャーへの攻撃
    if target and target in opponent.battle_zone:
        attack_target(game, attacker, target)
    # シールドへの攻撃
    elif target and target in opponent.shields:
        attack_target(game, attacker, None)
    else:
        response = jsonify(success=False, message="攻撃対象が見つかりません")
        return add_cors_headers(response), 400

    response = jsonify(success=True)
    return add_cors_headers(response)

import sys

@app.route('/api/ai_take_turn', methods=['POST'])
def ai_turn():
    take_turn_ai(game)  # ← ここでAIのターン進行を実行！
    response = jsonify({'result': 'ok'})
    return add_cors_headers(response)

@app.route('/api/attack_shield', methods=['POST'])
def attack_shield():
    data = request.get_json()
    attacker_id = data.get('attackerId')
    shield_id = data.get('shieldId')
    
    player = game.players[game.turn_player]
    opponent = game.players[1 - game.turn_player]
    
    # 攻撃するクリーチャーを探す
    attacker = next((c for c in player.battle_zone if c.id == attacker_id), None)
    if not attacker:
        response = jsonify({'error': '攻撃するクリーチャーが見つかりません'})
        return add_cors_headers(response), 404
        
    # シールドを探す
    shield = next((c for c in opponent.shields if c.id == shield_id), None)
    if not shield:
        response = jsonify({'error': '対象のシールドが見つかりません'})
        return add_cors_headers(response), 404
        
    # シールドを破壊
    opponent.shields.remove(shield)
    
    # シールドトリガーの処理
    from dm_core import resolve_shield_trigger
    trigger_used = resolve_shield_trigger(opponent, shield, game)
    
    if not trigger_used:
        opponent.hand.append(shield)
    
    # 攻撃済みフラグを設定
    player.attacked_creatures.append(attacker.id)
    
    response = jsonify({'status': 'ok'})
    return add_cors_headers(response)

@app.route('/api/graveyard_to_mana', methods=['POST'])
def graveyard_to_mana():
    game = get_or_create_game()
    data = request.get_json()
    card_id = data.get('cardId')
    player = game.players[game.turn_player]

    # 墓地からカードを探す
    card = next((c for c in player.graveyard if c.id == card_id), None)
    if not card:
        response = jsonify({'error': 'Card not found in graveyard'})
        return add_cors_headers(response), 404

    player.graveyard.remove(card)
    player.mana_zone.append(card)
    # 必要ならマナ加算
    if hasattr(card, 'civilizations') and len(card.civilizations) == 1:
        player.available_mana += 1

    response = jsonify({'status': 'ok', 'last_added_card': card.to_dict()})
    return add_cors_headers(response)


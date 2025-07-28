from flask import Flask, request, jsonify, Response
from flask_cors import CORS

import json

import random

import uuid

class Card:
    id_counter = iter(range(1, 1000000))

    def to_dict(self, attacked_creatures=None):
        d = {
            'id': self.id,
            'cost': self.cost,
            'name': self.name,
            'power': self.power,
            'civilizations': self.civilizations,
            'card_type': self.card_type,
            'abilities': self.abilities,
            'image_url': self.image_url or "https://placehold.jp/120x180.png",
            # 以下を追加
            'spell_cost': getattr(self, 'spell_cost', None),
            'spell_civilizations': getattr(self, 'spell_civilizations', []),
        }
        if attacked_creatures is not None:
            d['attacked'] = self.id in attacked_creatures
        return d

    def __init__(self, name, cost, power, card_type, civilizations, on_end_of_turn=None, species=None, on_play=None, abilities=None,on_attack=None,image_url=""):
        self.name = name
        self.cost = cost
        self.power = power
        self.card_type = card_type
        self.civilizations = civilizations if isinstance(civilizations, list) else [civilizations]
        self.specie = species
        self.on_play = on_play
        self.on_attack = on_attack 
        self.abilities = abilities if abilities else []
        self.on_end_of_turn = on_end_of_turn 
        self.id = str(uuid.uuid4())
        self.summoned_this_turn = False
        self.creature_id = next(Card.id_counter) if card_type == "creature" else None
        self.image_url = image_url

class twimpact(Card):
    def __init__(self, name,creature_name, spell_name, creature_cost, spell_cost, power,on_end_of_turn=None,
                 civilizations=None,creature_civilizations=None, spell_civilizations=None,creature_abilities=None,
                 spell_abilities=None, creature_species=None, spell_species=None, on_play=None):

        # 🔹 文明を統合（重複を排除）
        all_civs = set()
        if civilizations:
            all_civs.update(civilizations)
        if creature_civilizations:
            all_civs.update(creature_civilizations)
        if spell_civilizations:
            all_civs.update(spell_civilizations)


        super().__init__(name=creature_name, on_end_of_turn=on_end_of_turn,cost=creature_cost, power=power,
                           on_play=on_play,civilizations=list(all_civs), card_type="twimpact",)

 # ツインパクト専用属性
        self.name = name
        self.creature_name = creature_name
        self.spell_name = spell_name
        self.creature_cost = creature_cost
        self.spell_cost = spell_cost
        self.on_end_of_turn =on_end_of_turn if on_end_of_turn else []
        self.creature_civilizations = creature_civilizations if creature_civilizations else []  # クリーチャーの文明
        self.spell_civilizations = spell_civilizations if spell_civilizations else []  # 呪文の文明
        self.creature_abilities = creature_abilities if creature_abilities else []  # クリーチャーの効果
        self.spell_abilities = spell_abilities if spell_abilities else []  # 呪文の効果
        self.creature_species = creature_species  # クリーチャーの種族
        self.spell_species = spell_species  # 呪文の種族
        self.summoned_this_turn = False  # 召喚されたターンを記録するフラグ
        self.on_play = on_play

class PlayerState:
    def __init__(self, name, deck):
        self.name = name  # プレイヤー名
        self.deck = deck  # 山札
        self.hand = []  # 手札
        self.mana_zone = []  # マナゾーン
        self.battle_zone = []  # バトルゾーン
        self.battle_entry_order = [] 
        self.shields = []  # シールド
        self.graveyard = []  # 墓地
        self.available_mana = 0  # 使用可能なマナの数
        self.summoned_creatures = []  # **召喚されたばかりのクリーチャー**
        self.attacked_creatures = []  # **そのターン攻撃済みのクリーチャー**
        self.creatures_summoned_this_turn = 0  # ターン中に追加されたクリーチャーの数
        self.used_mana_this_turn = False  # ✅ 最初から False にしておく！
        self.cannot_attack_this_turn = []
        self.played_card_without_mana = False
        self.no_zone = []  # どこでもないゾーン


class GameState:
    def __init__(self, player1, player2, turn_player=0):
        self.players = [player1, player2]
        self.turn_player = turn_player
        self.turn_started = False
        self.turn_count = 0
        self.pending_choice = False  # 選択待ち中か
        self.choice_candidates = []  # 候補カード(Cardインスタンス)
        self.choice_purpose = ""     # "hand" "mana" "grave" など
        self.choice_callback = None  # 選択結果を受け取るコールバック
        self.dedodam_state = None
        self.pending_choice_player = None

    def is_opponent_turn(self, player):
        return self.players[self.turn_player] != player

# ✅ 共通の選択処理（人間/AI 共通）
def select_card_from_options(cards, player, purpose="hand"):
    print("[select_card_from_options] called, cards:", [c.name for c in cards], "purpose:", purpose)
    is_ai = hasattr(player, "is_ai") and player.is_ai

    # --- AIプレイヤーは従来通り自動選択 ---
    if is_ai and hasattr(player, "ai"):
        if purpose == "hand":
            return sorted(cards, key=lambda c: player.ai.should_add_to_hand(c, player), reverse=True)[0]
        elif purpose == "mana":
            return sorted(cards, key=lambda c: not player.ai.should_add_to_hand(c, player))[0]
        elif purpose == "attack":
            return sorted(cards, key=lambda c: (not getattr(c, "tapped", False), c.power))[0]
        elif purpose == "shield_break":
            import random
            return random.choice(cards)
        else:
            return cards[0]
        
    from flask import has_request_context
    game = globals().get('game')
    if game and hasattr(game, "pending_choice") and has_request_context():
        # プレイヤーIDを明示的にセット
        if not getattr(game, "pending_choice", False):
            # 人間視点でのAPIならpending_choice_player=0
            if hasattr(player, "is_ai") and player.is_ai:
                # AIが呼び出した場合はpending_choice_player=1（基本フロントには渡さない）
                game.pending_choice_player = 1
            else:
                game.pending_choice_player = 0
            game.pending_choice = True
            game.choice_candidates = cards
            game.choice_purpose = purpose
            game.choice_callback = None
        return None


    # --- CLI（デバッグ等）は従来通りinputで選択 ---
    while True:
        print(f"[DEBUG] select_card_from_options: is_ai={is_ai}, has_ai={hasattr(player, 'ai')}, purpose={purpose}")
        print(f"どのカードを {purpose} に選びますか？")
        for i, card in enumerate(cards):
            print(f"{i}: {card.name}")
        choice = input("番号を入力してください: ").strip()
        if choice.isdigit():
            index = int(choice)
            if 0 <= index < len(cards):
                return cards[index]
        print("無効な入力です。")


#　カード情報
def trigger_battle_zone_effect(player, name=None, species=None, condition_func=None, effect_func=None):
    """
    バトルゾーンに存在する特定のクリーチャーに対して条件を満たす場合、効果を発動する

    Parameters:
    - player: PlayerState
    - name: 発動対象とするカード名（省略可）
    - species: 対象とする種族（省略可）
    - condition_func: 条件を満たすかどうかを判定する関数（引数：クリーチャー）
    - effect_func: 効果を発動する関数（引数：player, クリーチャー）
    """

    for creature in player.battle_zone:
        # 名前や種族でフィルター（指定された場合）
        if name and creature.name != name:
            continue
        if species and (not hasattr(creature, 'species') or species not in creature.species):
            continue

        # 条件関数を満たす場合のみ
        if condition_func is None or condition_func(creature):
            if effect_func:
                effect_func(player, creature)

# ================= シールドトリガー判定 =================
def has_shield_trigger(card):
    abilities = getattr(card, "abilities", []) or []
    return any("シールドトリガー" in ab or "G・ストライク" in ab for ab in abilities)

# ================= ガードストライク処理（人間用） =================
def apply_guard_strike_effect(game, player):
    opponent = game.players[1 - game.turn_player]
    if not opponent.battle_zone:
        print("相手のバトルゾーンにクリーチャーがいないため、G・ストライクは発動しません。")
        return

    print(f"【{opponent.name} のバトルゾーン】")
    for i, card in enumerate(opponent.battle_zone):
        print(f"{i}: {card.name} (パワー {card.power})")

    while True:
        choice = input("G・ストライクで攻撃不能にするクリーチャーの番号を選んでください：").strip()
        if choice.isdigit():
            index = int(choice)
            if 0 <= index < len(opponent.battle_zone):
                target = opponent.battle_zone[index]
                if not hasattr(opponent, "cannot_attack_this_turn"):
                    opponent.cannot_attack_this_turn = []
                opponent.cannot_attack_this_turn.append(target.id)
                print(f"{target.name} はこのターン攻撃できない！")
                return
        print("無効な入力です。")

def resolve_shield_trigger(player, shield_card, game):
    """ブレイクされたシールドのカードにトリガーがあれば使用する"""
    is_ai = hasattr(player, "is_ai") and player.is_ai

    if has_shield_trigger(shield_card):
        print(f"{player.name} のシールドから {shield_card.name}（トリガー持ち）がブレイクされました！")

        if "G・ストライク" in "".join(shield_card.abilities):
            if is_ai:
                opponent = game.players[1 - game.players.index(player)]
                if opponent.battle_zone:
                    target = max(opponent.battle_zone, key=lambda c: c.power)
                    if not hasattr(opponent, "cannot_attack_this_turn"):
                        opponent.cannot_attack_this_turn = []
                    opponent.cannot_attack_this_turn.append(target.id)
                    print(f"[AI] {target.name} はこのターン攻撃できない（G・ストライク）")
            else:
                apply_guard_strike_effect(game, player)

        if "シールドトリガー" in "".join(shield_card.abilities):
            if is_ai:
                if shield_card.card_type == "spell" and hasattr(shield_card, "on_play"):
                    shield_card.on_play(player)
                    player.graveyard.append(shield_card)
                elif shield_card.card_type == "creature":
                    summon_creature_to_battle_zone(player, shield_card, shield_card, from_effect=True)
            else:
                while True:
                    choice = input(f"{shield_card.name} をコストを支払わずに使いますか？ (y/n): ").strip().lower()
                    if choice == "y":
                        if shield_card.card_type == "spell":
                            if hasattr(shield_card, "on_play") and callable(shield_card.on_play):
                                shield_card.on_play(player)
                        elif shield_card.card_type == "creature":
                            summon_creature_to_battle_zone(player, shield_card, shield_card, from_effect=True)
                        return True
                    elif choice == "n":
                        break
    return False

# ================= ブレイク数の計算 =================
def get_break_count(creature):
    if isinstance(creature, twimpact):
        abilities = creature.creature_abilities or []
    else:
        abilities = getattr(creature, "abilities", []) or []

    if any("ワールド・ブレイカー" in ab for ab in abilities):
        return 5
    if any("Q・ブレイカー" in ab for ab in abilities):
        return 4
    if any("T・ブレイカー" in ab for ab in abilities):
        return 3
    if any("W・ブレイカー" in ab for ab in abilities):
        return 2
    return 1

def speed_atacker(creature_card):
    """
    スピードアタッカーまたは進化クリーチャーなら召喚酔いを無視
    """
    text = "".join(creature_card.abilities)
    if "スピードアタッカー" in text or any("進化" in t for t in creature_card.card_type):
        creature_card.summoned_this_turn = False
    else:
        creature_card.summoned_this_turn = True

def boost(player, count=1, from_effect=False):
    if not player.deck:
        return
    
    card = player.deck.pop(0)
    player.mana_zone.append(card)
    print(f"[BoostEffect] {player.name} が {card.name} をマナゾーンに置いた(from_effect={from_effect})")

    if hasattr(card, 'civilizations') and isinstance(card.civilizations, list):
        if len(card.civilizations) == 1:
            player.available_mana += 1
            print(f"{player.name} は {card.name}（{card.civilizations[0]}） をマナゾーンに置いた！（使用可能マナ +1）")
        else:
            print(f"{player.name} は {card.name}（多文明） をマナゾーンに置いた！（使用可能マナには加算されない）")

    # ✅ 通常プレイ時のみフラグを立てる
    if not from_effect:
        player.used_mana_this_turn = True

def draw(player, x, from_effect=False):
    for _ in range(min(x, len(player.deck))):
        card = player.deck.pop(0)
        player.hand.append(card)
    print(f"{player.name} は山札から {x} 枚カードを引いた。")

    if not from_effect:
        player.used_mana_this_turn = True


def reveal_top_cards(player, count):
    """
    山札の上から count 枚のカードを確認して返すだけの共通処理。
    ※ 副作用として山札からは取り除かれるが、ゾーンへの分配は呼び出し元が行う。
    """
    revealed = []
    for _ in range(min(count, len(player.deck))):
        revealed.append(player.deck.pop(0))
    print(f"{player.name} の山札の上から {len(revealed)} 枚を確認:")
    for card in revealed:
        print(f" - {card.name}")
    return revealed


def increase_graveyard(player, deck, x):
    """
    山札の上から x 枚墓地に置く。
    """
    for _ in range(min(x, len(deck))):
        card = deck.pop(0)
        player.graveyard.append(card)
    print(f"{player.name} は山札の上から {x} 枚のカードを墓地に置いた。")


def add_shield(player, deck, x):
    """
    山札の上から x 枚カードをシールドに追加する。
    """
    for _ in range(min(x, len(deck))):
        card = deck.pop(0)
        player.shield_zone.append(card)
    print(f"{player.name} は山札の上から {x} 枚のカードをシールドに追加した。")


def dispose(player, x):
    """
    手札を x 枚捨てる。
    """
    for _ in range(min(x, len(player.hand))):
        discarded_card = player.hand.pop(0)  # 手札の先頭から削除
        player.graveyard.append(discarded_card)
    print(f"{player.name} は手札を {x} 枚捨てた。")

def get_valid_targets(player, kind="destroy"):
    return player.battle_zone[:]

def remove_creature(player, target_creature, kind="destroy", amount=None):
    if target_creature not in player.battle_zone:
        return

    if kind == "destroy":
        player.battle_zone.remove(target_creature)
        player.graveyard.append(target_creature)
        print(f"{target_creature.name} を破壊した。")

    elif kind == "minus_power":
        original_power = target_creature.power
        target_creature.power -= amount or 2000
        print(f"{target_creature.name} のパワーを {original_power} → {target_creature.power} に下げた。")

    elif kind == "mana_send":
        player.battle_zone.remove(target_creature)
        player.mana_zone.append(target_creature)
        print(f"{target_creature.name} をマナゾーンに送った。")

    elif kind == "bounce":
        player.battle_zone.remove(target_creature)
        player.hand.append(target_creature)
        print(f"{target_creature.name} を手札に戻した。")

def handes(opponent, x):
    """
    相手の手札からランダムにx枚捨てさせる（見ずに）
    """
    import random

    actual_count = min(x, len(opponent.hand))
    discarded = random.sample(opponent.hand, actual_count)

    for card in discarded:
        opponent.hand.remove(card)
        opponent.graveyard.append(card)

    print(f"{opponent.name} の手札から {actual_count} 枚が捨てられた。")

def dedodam_effect(player, from_effect=False):
    if len(player.deck) < 3:
        return

    top_three = [player.deck.pop(0) for _ in range(3)]
    game.dedodam_state         = {"top_three": top_three.copy()}
    game.pending_choice        = True
    game.pending_choice_player = game.turn_player
    game.choice_candidates     = top_three.copy()
    game.choice_purpose        = "hand"

    if not from_effect:
        player.used_mana_this_turn = True

import random
from copy import deepcopy
import uuid

def yobinion(player, maruru_id=None, summon_func=None):
    """
    ヨビニオン能力処理（完全版）
    - 山札の上から1枚ずつめくり、コスト4未満のクリーチャーが出るまで続ける
    - 条件を満たすクリーチャー1体を、渡された summon_func を使ってバトルゾーンに出す
    - 出したカードがマルル自身でないか確認する（idで）
    - 残りは山札の下にシャッフルして戻す
    """

    revealed = []
    selected_index = -1

    while player.deck:
        card = player.deck.pop(0)
        revealed.append(card)

        # 条件：コスト4未満のクリーチャー、かつマルル自身でない
        if card.card_type == "creature" and card.cost < 4:
            if getattr(card, "id", None) == maruru_id or card.name == "ヨビニオン・マルル":
                continue
            selected_index = len(revealed) - 1
            break

    selected_card = None
    if selected_index != -1:
        selected_card = deepcopy(revealed[selected_index])
        selected_card.id = str(uuid.uuid4())

        # ✅ 効果による召喚を適切に処理
        if summon_func:
            summon_func(player, selected_card, selected_card, from_effect=True)
        else:
            # fallback（デバッグ用途）
            player.battle_zone.append(selected_card)
            selected_card.summoned_this_turn = False
            print(f"[DEBUG] summon_func が渡されていないため、直接バトルゾーンに追加")

        print(f"ヨビニオン効果：{selected_card.name} をバトルゾーンに出しました！ used_mana_this_turn = {player.used_mana_this_turn}")

        # ✅ マルル効果チェック（2体目など）
        check_and_trigger_maruru_effect(player)

    # 条件に一致しなかったカードを山札の下へ
    to_return = [c for i, c in enumerate(revealed) if i != selected_index]
    random.shuffle(to_return)
    player.deck.extend(to_return)

    return selected_card

def check_and_trigger_maruru_effect(player, ignore_current=False):
    if not hasattr(player, "maruru_effect_used"):
        player.maruru_effect_used = False
    if not hasattr(player, "maruru_creature_this_turn"):
        player.maruru_creature_this_turn = 0

    player.maruru_creature_this_turn += 1

    if player.maruru_creature_this_turn == 2 and not player.maruru_effect_used:
        # 🔽 ignore_current=True の場合はここでスキップ
        if ignore_current:
            return

        if any(c.name == "ヨビニオン・マルル" for c in player.battle_zone):
            print("ヨビニオン・マルルの効果が発動！")
            player.maruru_effect_used = True
            yobinion_maruru_summon(player)

def yobinion_maruru_summon(player):
    game = globals().get('game')
    if not player.deck:
        print("山札がありません。")
        return

    top_card = player.deck.pop(0)
    print(f"ヨビニオン・マルル効果：山札の一番上は {top_card.name} です。")

    from flask import has_request_context
    if has_request_context():
        game.pending_choice = True
        game.pending_choice_player = 0   # ここを絶対「0」に固定（player==game.players[0]なら）
        game.choice_candidates = [top_card]
        game.choice_purpose = "hand_or_mana"
        game.choice_callback = None
        print(f"【DEBUG】マルル効果pending_choiceセット: pending_choice_player={game.pending_choice_player}, choice_candidates={[c.name for c in game.choice_candidates]}")
        return
    else:
        # CLIデバッグ用
        while True:
            choice = input(f"{top_card.name} を（h: 手札 / m: マナ）：").strip().lower()
            if choice == "h":
                player.hand.append(top_card)
                break
            elif choice == "m":
                player.mana_zone.append(top_card)
                break
            print("無効な入力です。")

def reset_maruru_flags(player):
    """
    各ターンの開始時にマルル効果使用フラグと出たクリーチャー数をリセットする
    """
    player.maruru_effect_used = False
    player.maruru_creature_this_turn = 0

def maruru_on_play(player, from_effect=False):
    # 天災デドダムを山札から取り出して召喚する（スペースなしの名前に合わせる）
    dedodam = None
    for i, c in enumerate(player.deck):
        if c.name == "天災デドダム":  # サンプルデッキではスペースなし
            dedodam = player.deck.pop(i)
            break
    if not dedodam:
        return
    # on_play 経由で battle_entry_order にも追加＆デドダム効果を発動
    summon_creature_to_battle_zone(player, dedodam, dedodam, from_effect=True)

def gaiaash_kaiser_end_of_turn(player, game):
    """
    ガイアッシュ・カイザーの特殊召喚条件をチェックして実行する。
    - 相手ターン中
    - 相手がマナを使わずにクリーチャーや呪文を使った
    - すでにガイアッシュが場にいない
    """
    opponent = game.players[1 - game.turn_player]

    if not game.is_opponent_turn(player):
        return

    if getattr(opponent, "played_card_without_mana", True):
        # 相手の行動でマナが使用されなかった場合のみ
        if not any(c.name == "流星のガイアッシュ・カイザー" for c in player.battle_zone):
            for card in player.hand:
                if card.name == "流星のガイアッシュ・カイザー":
                    confirm = input(f"{player.name} は《流星のガイアッシュ・カイザー》を無料で召喚しますか？ (y/n): ").strip().lower()
                    if confirm == "y":
                        player.hand.remove(card)
                        card.id = str(uuid.uuid4())
                        card.summoned_this_turn = True
                        player.battle_zone.append(card)
                        print(f"{player.name} は《流星のガイアッシュ・カイザー》をコストを支払わずに召喚した！")

                        # 出た時効果（2ドロー）
                        if hasattr(card, "on_play") and callable(card.on_play):
                            card.on_play(player)
                    break

def gaiaash_on_play(player, from_effect=False):
    draw(player, 2, from_effect=from_effect)
    print("《流星のガイアッシュ・カイザー》の能力：カードを2枚引く")

def adjust_cost_with_gaiaash(player, original_cost):
    """
    ガイアッシュ・カイザーがバトルゾーンにある場合、10以上のクリーチャーのコストを4減少。
    """
    if original_cost >= 10 and any(c.name == "流星のガイアッシュ・カイザー" for c in player.battle_zone):
        return max(original_cost - 4, 1)
    return original_cost

def is_attack_blocked_by_gaiaash(opponent, creature):
    """
    ガイアッシュの効果：相手のクリーチャーは出たターンに攻撃できない
    """
    return any(c.name == "流星のガイアッシュ・カイザー" for c in opponent.battle_zone) and creature.summoned_this_turn

def shrink_shields_on_entry(player, from_effect=False):
    opponent = game.players[1 - game.turn_player]
    for p in [player, opponent]:
        if len(p.shields) > 3:
            excess = p.shields[3:]
            p.shields = p.shields[:3]
            for card in excess:
                p.graveyard.append(card)
            print(f"{p.name} のシールドが3枚になるように調整された。")

def jaouga_attack_effect(player, game):
    opponent = game.players[1 - game.turn_player]

    # 相手クリーチャーを1体破壊（最初の1体を対象）
    if opponent.battle_zone:
        target = opponent.battle_zone[0]
        remove_creature(opponent, target)

    # 相手の手札を2枚ランダムに捨てさせる
    handes(opponent, 2)


# サンプルカード（本来はもっと多くの種類を定義）
import importlib

sample_deck = [
    twimpact(
        name="肉付きマナ送り/ブースト",
        creature_name="配球の超人", spell_name="記録的剛球",
        creature_cost=8, spell_cost=2, power=14000,
        civilizations=["緑"], creature_civilizations=["緑"], spell_civilizations=["緑"],
        creature_species=["ジャイアント"], spell_species=["ジャイアント・スキル"],
        creature_abilities=[
            "T・ブレイカー",
            "■このクリーチャーが出た時、相手のクリーチャーを１体選び、持ち主のマナゾーンに置く。"
        ],
        spell_abilities=["山札の上から1枚マナゾーンに置く。"],
        on_play=boost
    ),

        twimpact(
        name="肉付きマナ送り/ブースト",
        creature_name="配球の超人", spell_name="記録的剛球",
        creature_cost=8, spell_cost=2, power=14000,
        civilizations=["緑"], creature_civilizations=["緑"], spell_civilizations=["緑"],
        creature_species=["ジャイアント"], spell_species=["ジャイアント・スキル"],
        creature_abilities=[
            "T・ブレイカー",
            "■このクリーチャーが出た時、相手のクリーチャーを１体選び、持ち主のマナゾーンに置く。"
        ],
        spell_abilities=["山札の上から1枚マナゾーンに置く。"],
        on_play=boost
    ),

        twimpact(
        name="肉付きマナ送り/ブースト",
        creature_name="配球の超人", spell_name="記録的剛球",
        creature_cost=8, spell_cost=2, power=14000,
        civilizations=["緑"], creature_civilizations=["緑"], spell_civilizations=["緑"],
        creature_species=["ジャイアント"], spell_species=["ジャイアント・スキル"],
        creature_abilities=[
            "T・ブレイカー",
            "■このクリーチャーが出た時、相手のクリーチャーを１体選び、持ち主のマナゾーンに置く。"
        ],
        spell_abilities=["山札の上から1枚マナゾーンに置く。"],
        on_play=boost
    ),

        twimpact(
        name="肉付きマナ送り/ブースト",
        creature_name="配球の超人", spell_name="記録的剛球",
        creature_cost=8, spell_cost=2, power=14000,
        civilizations=["緑"], creature_civilizations=["緑"], spell_civilizations=["緑"],
        creature_species=["ジャイアント"], spell_species=["ジャイアント・スキル"],
        creature_abilities=[
            "T・ブレイカー",
            "■このクリーチャーが出た時、相手のクリーチャーを１体選び、持ち主のマナゾーンに置く。"
        ],
        spell_abilities=["山札の上から1枚マナゾーンに置く。"],
        on_play=boost
    ),

        twimpact(
        name="肉付きマナ送り/ブースト",
        creature_name="配球の超人", spell_name="記録的剛球",
        creature_cost=8, spell_cost=2, power=14000,
        civilizations=["緑"], creature_civilizations=["緑"], spell_civilizations=["緑"],
        creature_species=["ジャイアント"], spell_species=["ジャイアント・スキル"],
        creature_abilities=[
            "T・ブレイカー",
            "■このクリーチャーが出た時、相手のクリーチャーを１体選び、持ち主のマナゾーンに置く。"
        ],
        spell_abilities=["山札の上から1枚マナゾーンに置く。"],
        on_play=boost
    ),

        twimpact(
        name="肉付きマナ送り/ブースト",
        creature_name="配球の超人", spell_name="記録的剛球",
        creature_cost=8, spell_cost=2, power=14000,
        civilizations=["緑"], creature_civilizations=["緑"], spell_civilizations=["緑"],
        creature_species=["ジャイアント"], spell_species=["ジャイアント・スキル"],
        creature_abilities=[
            "T・ブレイカー",
            "■このクリーチャーが出た時、相手のクリーチャーを１体選び、持ち主のマナゾーンに置く。"
        ],
        spell_abilities=["山札の上から1枚マナゾーンに置く。"],
        on_play=boost
    ),

    Card(
        name="ブースト",
        cost=2,
        civilizations=["緑"],
        power=None,
        card_type="spell",
        abilities=[
            "■ G・ストライク（この呪文を自分のシールドゾーンから手札に加える時、相手に見せ、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）",
            "■ 自分の山札の上から1枚目をマナゾーンに置く。"
        ],
        on_play= boost
    ),

        Card(
        name="ブースト",
        cost=2,
        civilizations=["緑"],
        power=None,
        card_type="spell",
        abilities=[
            "■ G・ストライク（この呪文を自分のシールドゾーンから手札に加える時、相手に見せ、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）",
            "■ 自分の山札の上から1枚目をマナゾーンに置く。"
        ],
        on_play= boost
    ),

        Card(
        name="ブースト",
        cost=2,
        civilizations=["緑"],
        power=None,
        card_type="spell",
        abilities=[
            "■ G・ストライク（この呪文を自分のシールドゾーンから手札に加える時、相手に見せ、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）",
            "■ 自分の山札の上から1枚目をマナゾーンに置く。"
        ],
        on_play= boost
    ),

        Card(
        name="ブースト",
        cost=2,
        civilizations=["緑"],
        power=None,
        card_type="spell",
        abilities=[
            "■ G・ストライク（この呪文を自分のシールドゾーンから手札に加える時、相手に見せ、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）",
            "■ 自分の山札の上から1枚目をマナゾーンに置く。"
        ],
        on_play= boost
    ),

        Card(
        name="ブースト",
        cost=2,
        civilizations=["緑"],
        power=None,
        card_type="spell",
        abilities=[
            "■ G・ストライク（この呪文を自分のシールドゾーンから手札に加える時、相手に見せ、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）",
            "■ 自分の山札の上から1枚目をマナゾーンに置く。"
        ],
        on_play= boost
    ),

        Card(
        name="ブースト",
        cost=2,
        civilizations=["緑"],
        power=None,
        card_type="spell",
        abilities=[
            "■ G・ストライク（この呪文を自分のシールドゾーンから手札に加える時、相手に見せ、相手のクリーチャーを１体選んでもよい。このターン、そのクリーチャーは攻撃できない）",
            "■ 自分の山札の上から1枚目をマナゾーンに置く。"
        ],
        on_play= boost
    ),

    Card(
        name="天災デドダム",
        cost=3,
        civilizations=["緑","青","黒"],
        power=3000,
        card_type="creature",
        abilities=[
            "■ このクリーチャーが出た時、自分の山札の上から3枚を見る。そのうち1枚を手札に、1枚をマナゾーンに、残り1枚を墓地に置く。"
        ],
        on_play=lambda player, from_effect=False: dedodam_effect(player, from_effect=from_effect),
        species=["トリニティ・コマンド", "侵略者"]
    ),

        Card(
        name="天災デドダム",
        cost=3,
        civilizations=["緑","青","黒"],
        power=3000,
        card_type="creature",
        abilities=[
            "■ このクリーチャーが出た時、自分の山札の上から3枚を見る。そのうち1枚を手札に、1枚をマナゾーンに、残り1枚を墓地に置く。"
        ],
        on_play=lambda player, from_effect=False: dedodam_effect(player, from_effect=from_effect),
        species=["トリニティ・コマンド", "侵略者"]
    ),

        Card(
        name="天災デドダム",
        cost=3,
        civilizations=["緑","青","黒"],
        power=3000,
        card_type="creature",
        abilities=[
            "■ このクリーチャーが出た時、自分の山札の上から3枚を見る。そのうち1枚を手札に、1枚をマナゾーンに、残り1枚を墓地に置く。"
        ],
        on_play=lambda player, from_effect=False: dedodam_effect(player, from_effect=from_effect),
        species=["トリニティ・コマンド", "侵略者"]
    ),

        Card(
        name="天災デドダム",
        cost=3,
        civilizations=["緑","青","黒"],
        power=3000,
        card_type="creature",
        abilities=[
            "■ このクリーチャーが出た時、自分の山札の上から3枚を見る。そのうち1枚を手札に、1枚をマナゾーンに、残り1枚を墓地に置く。"
        ],
        on_play=lambda player, from_effect=False: dedodam_effect(player, from_effect=from_effect),
        species=["トリニティ・コマンド", "侵略者"]
    ),

        Card(
        name="天災デドダム",
        cost=3,
        civilizations=["緑","青","黒"],
        power=3000,
        card_type="creature",
        abilities=[
            "■ このクリーチャーが出た時、自分の山札の上から3枚を見る。そのうち1枚を手札に、1枚をマナゾーンに、残り1枚を墓地に置く。"
        ],
        on_play=lambda player, from_effect=False: dedodam_effect(player, from_effect=from_effect),
        species=["トリニティ・コマンド", "侵略者"]
    ),

        Card(
        name="天災デドダム",
        cost=3,
        civilizations=["緑","青","黒"],
        power=3000,
        card_type="creature",
        abilities=[
            "■ このクリーチャーが出た時、自分の山札の上から3枚を見る。そのうち1枚を手札に、1枚をマナゾーンに、残り1枚を墓地に置く。"
        ],
        on_play=lambda player, from_effect=False: dedodam_effect(player, from_effect=from_effect),
        species=["トリニティ・コマンド", "侵略者"]
    ),

    Card(
        name="ヨビニオン・マルル",
        cost=4,
        power=5000,
        card_type="creature",
        civilizations=["緑"],
        abilities=["ヨビニオン", "2体目の召喚時にドロー/マナ効果"],
        species="スノーフェアリー",
        on_play= maruru_on_play
    ),

        Card(
        name="ヨビニオン・マルル",
        cost=4,
        power=5000,
        card_type="creature",
        civilizations=["緑"],
        abilities=["ヨビニオン", "2体目の召喚時にドロー/マナ効果"],
        species="スノーフェアリー",
        on_play= maruru_on_play
    ),

        Card(
        name="ヨビニオン・マルル",
        cost=4,
        power=5000,
        card_type="creature",
        civilizations=["緑"],
        abilities=["ヨビニオン", "2体目の召喚時にドロー/マナ効果"],
        species="スノーフェアリー",
        on_play= maruru_on_play
    ),

        Card(
        name="ヨビニオン・マルル",
        cost=4,
        power=5000,
        card_type="creature",
        civilizations=["緑"],
        abilities=["ヨビニオン", "2体目の召喚時にドロー/マナ効果"],
        species="スノーフェアリー",
        on_play= maruru_on_play
    ),

        Card(
        name="ヨビニオン・マルル",
        cost=4,
        power=5000,
        card_type="creature",
        civilizations=["緑"],
        abilities=["ヨビニオン", "2体目の召喚時にドロー/マナ効果"],
        species="スノーフェアリー",
        on_play= maruru_on_play
    ),

        Card(
        name="ヨビニオン・マルル",
        cost=4,
        power=5000,
        card_type="creature",
        civilizations=["緑"],
        abilities=["ヨビニオン", "2体目の召喚時にドロー/マナ効果"],
        species="スノーフェアリー",
        on_play= maruru_on_play
    ),

        Card(
        name="ヨビニオン・マルル",
        cost=4,
        power=5000,
        card_type="creature",
        civilizations=["緑"],
        abilities=["ヨビニオン", "2体目の召喚時にドロー/マナ効果"],
        species="スノーフェアリー",
        on_play= maruru_on_play
    ),

    Card(
        name="カウンターギミック",
        cost=6,
        power=8000,
        civilizations=["緑","青"],
        card_type="creature",
        abilities=[
            "W・ブレイカー",
            "相手ターン中にマナを使わずにカードを使った場合、手札から召喚可能",
            "このクリーチャーが出た時、カードを2枚引く",
            "自分のコスト10以上のクリーチャーのコストを4減らす（最低1）",
            "相手のクリーチャーは出たターン自分を攻撃できない"
        ],
        species=["ブルー・コマンド・ドラゴン", "グリーン・コマンド・ドラゴン", "ハンター"],
        on_play=gaiaash_on_play
        ,on_end_of_turn= gaiaash_kaiser_end_of_turn
    ),

        Card(
        name="カウンターギミック",
        cost=6,
        power=8000,
        civilizations=["緑","青"],
        card_type="creature",
        abilities=[
            "W・ブレイカー",
            "相手ターン中にマナを使わずにカードを使った場合、手札から召喚可能",
            "このクリーチャーが出た時、カードを2枚引く",
            "自分のコスト10以上のクリーチャーのコストを4減らす（最低1）",
            "相手のクリーチャーは出たターン自分を攻撃できない"
        ],
        species=["ブルー・コマンド・ドラゴン", "グリーン・コマンド・ドラゴン", "ハンター"],
        on_play=gaiaash_on_play
        ,on_end_of_turn= gaiaash_kaiser_end_of_turn
    ),

        Card(
        name="カウンターギミック",
        cost=6,
        power=8000,
        civilizations=["緑","青"],
        card_type="creature",
        abilities=[
            "W・ブレイカー",
            "相手ターン中にマナを使わずにカードを使った場合、手札から召喚可能",
            "このクリーチャーが出た時、カードを2枚引く",
            "自分のコスト10以上のクリーチャーのコストを4減らす（最低1）",
            "相手のクリーチャーは出たターン自分を攻撃できない"
        ],
        species=["ブルー・コマンド・ドラゴン", "グリーン・コマンド・ドラゴン", "ハンター"],
        on_play=gaiaash_on_play
        ,on_end_of_turn= gaiaash_kaiser_end_of_turn
    ),

        Card(
        name="カウンターギミック",
        cost=6,
        power=8000,
        civilizations=["緑","青"],
        card_type="creature",
        abilities=[
            "W・ブレイカー",
            "相手ターン中にマナを使わずにカードを使った場合、手札から召喚可能",
            "このクリーチャーが出た時、カードを2枚引く",
            "自分のコスト10以上のクリーチャーのコストを4減らす（最低1）",
            "相手のクリーチャーは出たターン自分を攻撃できない"
        ],
        species=["ブルー・コマンド・ドラゴン", "グリーン・コマンド・ドラゴン", "ハンター"],
        on_play=gaiaash_on_play
        ,on_end_of_turn= gaiaash_kaiser_end_of_turn
    ),

        Card(
        name="カウンターギミック",
        cost=6,
        power=8000,
        civilizations=["緑","青"],
        card_type="creature",
        abilities=[
            "W・ブレイカー",
            "相手ターン中にマナを使わずにカードを使った場合、手札から召喚可能",
            "このクリーチャーが出た時、カードを2枚引く",
            "自分のコスト10以上のクリーチャーのコストを4減らす（最低1）",
            "相手のクリーチャーは出たターン自分を攻撃できない"
        ],
        species=["ブルー・コマンド・ドラゴン", "グリーン・コマンド・ドラゴン", "ハンター"],
        on_play=gaiaash_on_play
        ,on_end_of_turn= gaiaash_kaiser_end_of_turn
    ),

        Card(
        name="カウンターギミック",
        cost=6,
        power=8000,
        civilizations=["緑","青"],
        card_type="creature",
        abilities=[
            "W・ブレイカー",
            "相手ターン中にマナを使わずにカードを使った場合、手札から召喚可能",
            "このクリーチャーが出た時、カードを2枚引く",
            "自分のコスト10以上のクリーチャーのコストを4減らす（最低1）",
            "相手のクリーチャーは出たターン自分を攻撃できない"
        ],
        species=["ブルー・コマンド・ドラゴン", "グリーン・コマンド・ドラゴン", "ハンター"],
        on_play=gaiaash_on_play
        ,on_end_of_turn= gaiaash_kaiser_end_of_turn
    ),

        Card(
        name="カウンターギミック",
        cost=6,
        power=8000,
        civilizations=["緑","青"],
        card_type="creature",
        abilities=[
            "W・ブレイカー",
            "相手ターン中にマナを使わずにカードを使った場合、手札から召喚可能",
            "このクリーチャーが出た時、カードを2枚引く",
            "自分のコスト10以上のクリーチャーのコストを4減らす（最低1）",
            "相手のクリーチャーは出たターン自分を攻撃できない"
        ],
        species=["ブルー・コマンド・ドラゴン", "グリーン・コマンド・ドラゴン", "ハンター"],
        on_play=gaiaash_on_play
        ,on_end_of_turn= gaiaash_kaiser_end_of_turn
    ),

    Card(
    name="フィニッシャー",
    cost=1,
    power=13000,
    civilizations=["黒"],
    card_type=["鬼S-MAX進化クリーチャー","creature"],
    species=["デモニオ", "鬼レクスターズ"],
    abilities=[
        "鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。",
        "このクリーチャーは進化元を必要としない。",
        "自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す。",
        "T・ブレイカー",
        "このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。",
        "このクリーチャーが攻撃する時、相手のクリーチャーを１体破壊し、相手の手札を２枚捨てさせる。"
    ],
    on_play=shrink_shields_on_entry,
    on_attack=jaouga_attack_effect
    ),

        Card(
    name="フィニッシャー",
    cost=1,
    power=13000,
    civilizations=["黒"],
    card_type=["鬼S-MAX進化クリーチャー","creature"],
    species=["デモニオ", "鬼レクスターズ"],
    abilities=[
        "鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。",
        "このクリーチャーは進化元を必要としない。",
        "自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す。",
        "T・ブレイカー",
        "このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。",
        "このクリーチャーが攻撃する時、相手のクリーチャーを１体破壊し、相手の手札を２枚捨てさせる。"
    ],
    on_play=shrink_shields_on_entry,
    on_attack=jaouga_attack_effect
    ),

        Card(
    name="フィニッシャー",
    cost=1,
    power=13000,
    civilizations=["黒"],
    card_type=["鬼S-MAX進化クリーチャー","creature"],
    species=["デモニオ", "鬼レクスターズ"],
    abilities=[
        "鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。",
        "このクリーチャーは進化元を必要としない。",
        "自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す。",
        "T・ブレイカー",
        "このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。",
        "このクリーチャーが攻撃する時、相手のクリーチャーを１体破壊し、相手の手札を２枚捨てさせる。"
    ],
    on_play=shrink_shields_on_entry,
    on_attack=jaouga_attack_effect
    ),

        Card(
    name="フィニッシャー",
    cost=1,
    power=13000,
    civilizations=["黒"],
    card_type=["鬼S-MAX進化クリーチャー","creature"],
    species=["デモニオ", "鬼レクスターズ"],
    abilities=[
        "鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。",
        "このクリーチャーは進化元を必要としない。",
        "自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す。",
        "T・ブレイカー",
        "このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。",
        "このクリーチャーが攻撃する時、相手のクリーチャーを１体破壊し、相手の手札を２枚捨てさせる。"
    ],
    on_play=shrink_shields_on_entry,
    on_attack=jaouga_attack_effect
    ),

        Card(
    name="フィニッシャー",
    cost=1,
    power=13000,
    civilizations=["黒"],
    card_type=["鬼S-MAX進化クリーチャー","creature"],
    species=["デモニオ", "鬼レクスターズ"],
    abilities=[
        "鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。",
        "このクリーチャーは進化元を必要としない。",
        "自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す。",
        "T・ブレイカー",
        "このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。",
        "このクリーチャーが攻撃する時、相手のクリーチャーを１体破壊し、相手の手札を２枚捨てさせる。"
    ],
    on_play=shrink_shields_on_entry,
    on_attack=jaouga_attack_effect
    ),

        Card(
    name="フィニッシャー",
    cost=1,
    power=13000,
    civilizations=["黒"],
    card_type=["鬼S-MAX進化クリーチャー","creature"],
    species=["デモニオ", "鬼レクスターズ"],
    abilities=[
        "鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。",
        "このクリーチャーは進化元を必要としない。",
        "自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す。",
        "T・ブレイカー",
        "このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。",
        "このクリーチャーが攻撃する時、相手のクリーチャーを１体破壊し、相手の手札を２枚捨てさせる。"
    ],
    on_play=shrink_shields_on_entry,
    on_attack=jaouga_attack_effect
    ),

        Card(
    name="フィニッシャー",
    cost=1,
    power=13000,
    civilizations=["黒"],
    card_type=["鬼S-MAX進化クリーチャー","creature"],
    species=["デモニオ", "鬼レクスターズ"],
    abilities=[
        "鬼S-MAX進化：自分がゲームに負ける時、またはこのクリーチャーが離れる時、かわりに自分の表向きのカードを３枚破壊してもよい。",
        "このクリーチャーは進化元を必要としない。",
        "自分のS-MAX進化クリーチャーが２体以上あれば、そのうちの１体を残し、残りをすべて手札に戻す。",
        "T・ブレイカー",
        "このクリーチャーが出た時、各プレイヤーは自身のシールドゾーンにあるカードを３枚ずつ選び、残りを墓地に置く。",
        "このクリーチャーが攻撃する時、相手のクリーチャーを１体破壊し、相手の手札を２枚捨てさせる。"
    ],
    on_play=shrink_shields_on_entry,
    on_attack=jaouga_attack_effect
    ),

]  # 40枚デッキを作成

def create_initial_game():
    # サンプルデッキ（40枚）を生成するための前提：sample_deck が global に存在すること
    
    def create_player(name):
        # デッキサイズは sample_deck の長さか 40 の小さいほうに合わせる
        deck_size = min(40, len(sample_deck))
        deck = random.sample(sample_deck, deck_size)
        return PlayerState(name=name, deck=deck)

    # プレイヤーのセットアップ
    player1 = create_player("Player 1")
    player2 = create_player("Player 2")

    # ゲームの初期状態
    game = GameState(player1, player2, turn_player=0)

    # 各プレイヤーの初期手札 & シールド設定
    for player in game.players:
        player.shields = [player.deck.pop() for _ in range(5)]
        player.hand = [player.deck.pop() for _ in range(5)]

        # 🔹 ここでAIを設定
    player2.is_ai = True
    player2.ai = RuleBasedAI(player_id=1)

    return game

#山札切れ処理
def game_over(game, winner):
    """ゲーム終了処理"""
    print(f"ゲーム終了！勝者は {game.players[winner].name} です！")
    exit()  # プログラムを終了

def check_deck_loss(game):
    """山札が0枚になった場合、敗北処理を行う"""
    for player_id, player in game.players.items():
        if not player.deck:  # 山札が0枚
            loser = player_id
            winner = 3 - player_id
            print(f"{player.name} は山札切れ！")
            game_over(game, winner)

# ターン進行の処理
def start_turn(game):
    player = game.players[game.turn_player]

    # 最初のターンはドローしない（1Pの初ターンのみ）
    if not (game.turn_count == 0 and game.turn_player == 0):
        if player.deck:
            player.hand.append(player.deck.pop())
            print(f"{player.name} は1枚ドローした。")

    player.available_mana = len(player.mana_zone)

    # 召喚酔い解除
    for creature_id in list(player.summoned_creatures):
        for creature in player.battle_zone:
            if creature.id == creature_id:
                print(f"{creature.name} の召喚酔いが解除されました。")
                break
    player.summoned_creatures.clear()

    # 各種ターンフラグ初期化
    player.creatures_summoned_this_turn = 0
    player.maruru_effect_used = False
    player.used_mana_this_turn = False  # ✅ マナ未使用で開始
    player.battle_entry_order.clear()
    player.cannot_attack_this_turn = []
    player.played_card_without_mana = False

    print(f"\n=========== {player.name} のターン開始 ============")

def show_battle_zone(game):
    """現在のバトルゾーンのカードを表示"""
    player = game.players[game.turn_player]
    opponent = game.players[1 - game.turn_player]

    print(f"\n【{player.name} のバトルゾーン】")
    if player.battle_zone:
        for i, card in enumerate(player.battle_zone):
            print(f"{i}: {card.name} (パワー {card.power})")
    else:
        print("なし")

    print(f"\n【{opponent.name} のバトルゾーン】")
    if opponent.battle_zone:
        for i, card in enumerate(opponent.battle_zone):
            print(f"{i}: {card.name} (パワー {card.power})")
    else:
        print("なし")
    print()

def show_shields(game):
    """現在のシールドの枚数を表示"""
    player = game.players[game.turn_player]
    opponent = game.players[1 - game.turn_player]

    print(f"\n【{player.name} のシールド】 {len(player.shields)} 枚")
    print(f"【{opponent.name} のシールド】 {len(opponent.shields)} 枚\n")

def display_mana_zones(game):
    """マナゾーンの表示"""
    for i, player in enumerate(game.players):
        all_civs = set(civ for card in player.mana_zone for civ in card.civilizations)
        civ_display = ' '.join(sorted(all_civs)) if all_civs else 'なし'
        print(f"\n【{player.name} のマナゾーン】 {len(player.mana_zone)} 枚 [{civ_display}]")
        for card in player.mana_zone:
            print(f"- {card.name} ({', '.join(card.civilizations)})")


def display_graveyards(game):
    """墓地の表示"""
    for i, player in enumerate(game.players):
        print(f"\n【{player.name} の墓地】 {len(player.graveyard)} 枚")
        for card in player.graveyard:
            print(f"- {card.name}")


def choose_mana_card_H(game):
    player = game.players[game.turn_player]  # 現在のプレイヤーを取得

    while True:
        # 現在のマナゾーンの文明を取得
        all_civilizations = set()
        for mana_card in player.mana_zone:
            if isinstance(mana_card.civilizations, list):
                all_civilizations.update(mana_card.civilizations)

        civ_display = ' '.join(sorted(all_civilizations)) if all_civilizations else 'なし'

        # マナゾーンの情報を表示
        print(f"\n【現在のマナゾーン】 {len(player.mana_zone)} 枚 [{civ_display}]")
        print(f"【使用可能マナ】 {player.available_mana}")
        print(f"【現在の手札】 {[f'{i}: {card.name}' for i, card in enumerate(player.hand)]}")

        action = input("マナゾーンに置くカードのインデックスを入力（スキップ:n マナ確認:m 墓地確認:g ターン終了:e）：").strip()

        if action.lower() == 'n':
            print("マナチャージをスキップしました。\n")
            break
        elif action.lower() == 'm':
            display_mana_zones(game)
        elif action.lower() == 'g':
            display_graveyards(game)
        elif action.isdigit():
            if action.lower() == "e":
                end_turn(game)
                break

            card_index = int(action)
            if 0 <= card_index < len(player.hand):
                card = player.hand.pop(card_index)

                # 🔹 ツインパクトカードの文明統合処理
                if isinstance(card, twimpact):
                    combined_civs = set(card.creature_civilizations + card.spell_civilizations)
                    card.civilizations = list(combined_civs)

                # マナゾーンに追加
                player.mana_zone.append(card)
                player.used_mana_this_turn = True

                # 文明数によって使用可能マナを加算するか判定
                if hasattr(card, 'civilizations') and isinstance(card.civilizations, list):
                    if len(card.civilizations) == 1:
                        player.available_mana += 1
                        print(f"{player.name} は {card.name} をマナゾーンに置いた（{card.civilizations[0]}、使用可能マナ +1）")
                    else:
                        print(f"{player.name} は {card.name} をマナゾーンに置いた（多文明、使用可能マナには加算されない）")

                # マナゾーンの文明再表示
                all_civilizations = set()
                for mana_card in player.mana_zone:
                    all_civilizations.update(mana_card.civilizations)
                civ_display = ' '.join(sorted(all_civilizations)) if all_civilizations else 'なし'

                print(f"【マナゾーンのカード枚数】 {len(player.mana_zone)} 枚 [{civ_display}]")
                print(f"【使用可能マナ】 {player.available_mana}\n")
                break

    print(f"【更新後の手札】 {[f'{i}: {card.name}' for i, card in enumerate(player.hand)]}\n")

def summon_creature_to_battle_zone(player, creature, creature_card, from_effect=False):
    """
    クリーチャーをバトルゾーンに出す共通処理
    - from_effect: True なら効果で出たもの（召喚酔いしない）
    """

    # ユニークIDを新規発行（同名カードでも区別）
    creature_card.id = str(uuid.uuid4())

    # バトルゾーンに追加
    player.battle_zone.append(creature_card)
    player.battle_entry_order.append(creature_card)

    speed_atacker(creature_card)

    # 攻撃済みリストから除外（出たばかりなので未攻撃）
    if creature_card.id in player.attacked_creatures:
        player.attacked_creatures.remove(creature_card.id)

    if from_effect:
        # 効果で出た場合は召喚酔いしない
        player.played_card_without_mana = True
        print(f"{creature_card.name} はコストを支払わずにバトルゾーンに出ました。")
    else:
            if creature_card.summoned_this_turn:  # ← 召喚酔いが True なら
                player.summoned_creatures.append(creature_card.id)
                print(f"{creature_card.name} を召喚！召喚酔い状態になった。")
            else:
                print(f"{creature_card.name} を召喚！召喚酔いなし！")

    # そのターンに出たクリーチャー数をカウント
    if not hasattr(player, "creatures_summoned_this_turn"):
        player.creatures_summoned_this_turn = 0

    player.creatures_summoned_this_turn += 1



    # 🔹 on_play 能力があれば実行（プレイ後処理を統合）
    if hasattr(creature_card, "on_play") and callable(creature_card.on_play):
        try:
            creature_card.on_play(player, from_effect=from_effect)
        except TypeError:
            creature_card.on_play(player)

        # 🔹 マルルの効果チェック
    check_and_trigger_maruru_effect(player)

def cast_spell(player, card, from_effect=False):
    """
    呪文カードを処理する関数
    - from_effect=True の場合、無償で唱えた扱いとして扱う
    """

    print(f"{player.name} は {card.name} を唱えた！")

    if from_effect:
        player.played_card_without_mana = True  # 🔥 無償呪文使用を記録

    if hasattr(card, "on_play") and callable(card.on_play):
        try:
            card.on_play(player, from_effect=from_effect)
        except TypeError:
            card.on_play(player)

    player.graveyard.append(card)

def play_as_creature(player, card, card_index,from_effect=False):
    """
    ツインパクトカードをクリーチャーとしてプレイする
    """

    # 必要な文明の取得
    required_civilizations = card.creature_civilizations if isinstance(card, twimpact) else card.civilizations

    # プレイヤーのマナゾーンの文明を取得
    player_mana_civs = [civ for mana_card in player.mana_zone for civ in (
        mana_card.creature_civilizations if isinstance(mana_card, twimpact) else mana_card.civilizations
    )]

    # 文明チェック
    if not all(civ in player_mana_civs for civ in required_civilizations):
        print(f"{player.name} は {card.creature_name} をプレイできない（文明が不足）\n")
        return

    # マナコストチェック
    if card.creature_cost > player.available_mana:
        print(f"{player.name} は {card.creature_name} をプレイできない（マナ不足）\n")
        return

    # マナ消費と手札から除去
    player.available_mana -= card.creature_cost
    if not from_effect:
        player.used_mana_this_turn = True  
    played_card = player.hand.pop(card_index)

    # 召喚処理（共通関数を使用）
    summon_creature_to_battle_zone(player, played_card, played_card, from_effect=False)

    # 能力発動（必要であれば）
    if hasattr(played_card, "on_play") and callable(played_card.on_play):
        played_card.on_play(player)

    print(f"{player.name} は {played_card.name} を召喚！")


def play_as_spell(player, card, card_index,from_effect=False):
    
        # **必要な文明の取得**
    required_civilizations = card.spell_civilizations if isinstance(card, twimpact) else card.civilizations

    # **プレイヤーのマナゾーンの文明を取得**
    player_mana_civs = [civ for mana_card in player.mana_zone for civ in (
        mana_card.spell_civilizations if isinstance(mana_card, twimpact) else mana_card.civilizations
    )]

    # **文明チェック**
    if not any(civ in player_mana_civs for civ in required_civilizations):
        print(f"{player.name} は {card.spell_name} をプレイできない（文明が不足）\n")
        return

    # **マナコストチェック**
    if card.spell_cost > player.available_mana:
        print(f"{player.name} は {card.spell_name} をプレイできない（マナ不足）\n")
        return

    # **マナ消費**
    player.available_mana -= card.spell_cost
    if not from_effect:
        player.used_mana_this_turn = True  

    # **呪文を唱える**
    print(f"{player.name} は {card.spell_name} を唱えた！")

   # **呪文の能力を発動**
    if hasattr(card, "on_play") and callable(card.on_play):
        card.on_play(player)

    # **呪文は使用後に墓地へ**
    player.graveyard.append(player.hand.pop(card_index))

    # **プレイ後の使用可能マナを表示**
    print(f"【プレイ後の使用可能マナ】 {player.available_mana}")

def process_battle_zone_effects(player, game):
    # 出た順に on_end_of_turn などを処理
    for creature in player.battle_entry_order:
        if hasattr(creature, "on_end_of_turn") and callable(creature.on_end_of_turn):
            creature.on_end_of_turn(player, game)

#マナコスト処理
import uuid

def play_card_H(game, card_index,from_effect=False):
    player = game.players[game.turn_player]
    opponent = game.players[1 - game.turn_player]

    if card_index < 0 or card_index >= len(player.hand):
        print("無効なカードインデックスです。")
        return

    card = player.hand[card_index]

    # ツインパクトカードの処理
    if card.card_type == "twimpact":
        while True:
            choice = input(f"{card.name} をクリーチャー（c）または呪文（s）としてプレイしますか？: ").strip().lower()
            if choice in ["c", "s"]:
                break
            print("無効な入力です。もう一度選択してください。")

        if choice == "c":
            play_as_creature(player, card, card_index)
        elif choice == "s":
            play_as_spell(player, card, card_index)
        return

    # 文明チェック
    if not any(
        civ in [civ for mana_card in player.mana_zone for civ in mana_card.civilizations]
        for civ in card.civilizations
    ):
        print(f"{player.name} は {card.name} をプレイできない（対応する文明のマナが不足）\n")
        return

    # マナコストチェック
    if card.cost > player.available_mana:
        print(f"{player.name} は {card.name} をプレイできない（マナ不足）\n")
        return

    # マナを支払って手札からカードを取り出す
    player.available_mana -= card.cost
    if not from_effect:
        player.used_mana_this_turn = True  
    card = player.hand.pop(card_index)

    if "creature" in card.card_type:
        summon_creature_to_battle_zone(player, card, card, from_effect=False)

        print(f"このターンに召喚された数: {player.creatures_summoned_this_turn}")

    elif card.card_type == "spell":
        cast_spell(player, card, from_effect=False)

    else:
        print("不明なカードタイプ")

    print(f"【プレイ後の使用可能マナ】 {player.available_mana}")


def attack_target(game, attacker, target=None):
    player = game.players[game.turn_player]
    opponent = game.players[1 - game.turn_player]
    is_ai = hasattr(player, "is_ai") and player.is_ai

    print(f"[DEBUG] 現在のターン: {game.turn_player}, プレイヤー名: {player.name}, is_ai: {is_ai}")

    # 攻撃時効果
    if hasattr(attacker, "on_attack") and callable(attacker.on_attack):
        attacker.on_attack(player, game)

    # ✅ ① ターゲットが直接指定されている（AIから呼び出されたとき）
    if target:
        if attacker.power > target.power:
            opponent.battle_zone.remove(target)
            opponent.graveyard.append(target)
            print(f"{attacker.name} が {target.name} を破壊！")
        elif attacker.power < target.power:
            player.battle_zone.remove(attacker)
            player.graveyard.append(attacker)
            print(f"{target.name} が {attacker.name} を破壊！")
        else:
            opponent.battle_zone.remove(target)
            opponent.graveyard.append(target)
            player.battle_zone.remove(attacker)
            player.graveyard.append(attacker)
            print(f"{attacker.name} と {target.name} が相打ちで破壊！")
        player.attacked_creatures.append(attacker.id)
        return
    
    elif is_ai:
        # ✅ AIが target=None で呼び出された → 自動的にシールドを攻撃
        break_count = get_break_count(attacker)
        actual_breaks = min(break_count, len(opponent.shields))
        print(f"[AI] {attacker.name} がシールドを {actual_breaks} 枚ブレイク！")

    for _ in range(actual_breaks):
        # 🔹 最後の1枚を割るなら＝勝利！
        if len(opponent.shields) == 1:
            print(f"[AI] {attacker.name} がダイレクトアタック！")
            print(f"{player.name} の勝利！")
            exit()

        broken_shield = select_card_from_options(opponent.shields, player, purpose="shield_break")
        opponent.shields.remove(broken_shield)

        trigger_used = resolve_shield_trigger(opponent, broken_shield, game)
        if not trigger_used:
            opponent.hand.append(broken_shield)
            print(f"{opponent.name} は {broken_shield.name} を手札に加えた。")


            player.attacked_creatures.append(attacker.id)
            return

    # ✅ ② 人間プレイヤーによる攻撃処理（inputで選択）
    while True:
        print("\n攻撃対象を選択:")
        print("1: 相手のシールド")
        print("2: 相手のバトルゾーンのクリーチャー")
        target_type = input("攻撃対象の番号を入力：").strip()

        if target_type == "1":
            if opponent.shields:
                break_count = get_break_count(attacker)
                print(f"{attacker.name} のブレイク数: {break_count}")

                is_ai = hasattr(player, "is_ai") and player.is_ai

                if break_count >= len(opponent.shields):
                    print(f"{player.name} の {attacker.name} が相手のシールドをすべてブレイク！")
                    for i in range(len(opponent.shields) - 1, -1, -1):
                        broken_shield = opponent.shields.pop(i)
                        print(f"シールド {i + 1} をブレイク！")
                        trigger_used = resolve_shield_trigger(opponent, broken_shield, game)
                        if not trigger_used:
                            opponent.hand.append(broken_shield)
                            print(f"{opponent.name} は {broken_shield.name} を手札に加えた。")
                else:
                    print("\n【相手のシールド】")
                    for i in range(len(opponent.shields)):
                        print(f"{i}: シールド {i+1}")

                    if is_ai:
                        # 🔹 AI：左から順に選ぶ
                        selected_indices = list(range(min(break_count, len(opponent.shields))))
                    else:
                        # 🔹 人間：インデックス選択
                        selected_indices = []
                        while len(selected_indices) < break_count:
                            shield_index = input(f"破壊するシールドのインデックスを {break_count} 枚選んでください（残り {break_count - len(selected_indices)} 枚）：").strip()
                            if shield_index.isdigit():
                                idx = int(shield_index)
                                if 0 <= idx < len(opponent.shields) and idx not in selected_indices:
                                    selected_indices.append(idx)
                                else:
                                    print("無効なインデックスです。")
                            else:
                                print("無効な入力です。")

                    # 🔽 共通の処理：選んだインデックスを後ろから pop
                    selected_indices.sort(reverse=True)

        for idx in selected_indices:
            # 🔹 最後の1枚を割るなら＝相手は敗北
            if len(opponent.shields) == 1:
                print(f"{player.name} の {attacker.name} がダイレクトアタック！")
                print(f"{player.name} の勝利！")
                exit()

            broken_shield = opponent.shields.pop(idx)
            print(f"{player.name} の {attacker.name} がシールド {idx + 1} をブレイク！")
            trigger_used = resolve_shield_trigger(opponent, broken_shield, game)
            if not trigger_used:
                opponent.hand.append(broken_shield)
                print(f"{opponent.name} は {broken_shield.name} を手札に加えた。")

            elif target_type == "2":
                if not opponent.battle_zone:
                    print("相手のバトルゾーンにクリーチャーがいません。\n")
                    continue

            print("\n【相手のバトルゾーン】")
            for i, card in enumerate(opponent.battle_zone):
                print(f"{i}: {card.name} (パワー: {card.power})")

            defender_index = input("攻撃する相手クリーチャーのインデックスを入力：").strip()
            if defender_index.isdigit():
                defender_index = int(defender_index)
                if 0 <= defender_index < len(opponent.battle_zone):
                    defender = opponent.battle_zone[defender_index]

                    if attacker.power > defender.power:
                        opponent.battle_zone.pop(defender_index)
                        opponent.graveyard.append(defender)
                        print(f"{attacker.name} が {defender.name} を破壊！\n")
                    elif attacker.power < defender.power:
                        player.battle_zone.remove(attacker)
                        player.graveyard.append(attacker)
                        print(f"{defender.name} が {attacker.name} を破壊！\n")
                    else:
                        player.battle_zone.remove(attacker)
                        player.graveyard.append(attacker)
                        opponent.battle_zone.pop(defender_index)
                        opponent.graveyard.append(defender)
                        print(f"{attacker.name} と {defender.name} が相打ちで破壊！\n")

                    player.attacked_creatures.append(attacker.id)
                    return
                else:
                    print("無効なインデックスです。")
            else:
                print("無効な入力です。")

def attack_phase(game):
    player = game.players[game.turn_player]  # **現在のプレイヤーを取得**
    opponent = game.players[1 - game.turn_player]  # 🔹 ここで相手プレイヤーを取得

    while True:
        print("\n攻撃対象を選択:")

        if not player.battle_zone:
            print("バトルゾーンにクリーチャーがいません。")
            return
        
        print("\n【攻撃可能なクリーチャー】")
        for i, creature in enumerate(player.battle_zone):
            status = "（召喚酔い中）" if creature.id in player.summoned_creatures else ""
            print(f"{i}: {creature.name} {status}")
        
        attacker_index = input("攻撃するクリーチャーの番号を入力（ターン終了:e マナ確認:m 墓地確認:g）： ")
        if attacker_index.lower() == 'm':
            display_mana_zones(game)
        elif attacker_index.lower() == 'g':
            display_graveyards(game)

        if attacker_index.lower() == 'e':
            end_turn(game)
            return
        
        try:
            attacker_index = int(attacker_index)
            if attacker_index < 0 or attacker_index >= len(player.battle_zone):
                print("無効なクリーチャー番号です。")
                continue
            
            attacker = player.battle_zone[attacker_index]

            # **召喚酔いチェック**
            if attacker.id in player.summoned_creatures:
                print(f"{attacker.name} は召喚されたターン中のため、攻撃できません。\n")
                continue

            if attacker.id in player.attacked_creatures:
                print(f"{attacker.name} は すでに攻撃済みなので攻撃できません！")
                continue

            
            # **攻撃処理**
            print(f"{attacker.name} が攻撃！")
            attack_target(game, attacker)  # 🔹 攻撃対象を選ばせる
            
        except ValueError:
            print("無効な入力です。")
            continue

def check_end_of_turn_triggers(game):
    """
    各プレイヤーのバトルゾーンのクリーチャーをチェックし、
    DM_named_ability 側に用意された効果を発動する。
    """
    for player in game.players:
        for creature in player.battle_zone:
            if hasattr(creature, "on_end_of_turn") and callable(creature.on_end_of_turn):
                creature.on_end_of_turn(player, game)

def end_turn(game):
    check_end_of_turn_triggers(game)  # ✅ ガイアッシュの効果などを先に確認

    # ✅ 手札にあるガイアッシュを確認して処理
    for player in game.players:
        for card in player.hand:
            if hasattr(card, "on_end_of_turn") and callable(card.on_end_of_turn):
                card.on_end_of_turn(player, game)

    # プレイヤー切り替えなどはトリガー実行後に
    game.turn_player = (game.turn_player + 1) % len(game.players)
    game.turn_started = False
    game.turn_count += 1

def play_card_for_ai(game, player, card_index, from_effect=False):
    opponent = game.players[1 - game.turn_player]

    if card_index < 0 or card_index >= len(player.hand):
        return

    card = player.hand[card_index]

    # ツインパクトカードの処理（AIは自動で使いやすい方を選ぶ：優先→クリーチャー）
    if card.card_type == "twimpact":
        civs_creature = card.creature_civilizations
        civs_spell = card.spell_civilizations
        mana_civs = [civ for mana_card in player.mana_zone for civ in mana_card.civilizations]

        can_cast_creature = all(civ in mana_civs for civ in civs_creature) and card.creature_cost <= player.available_mana
        can_cast_spell = any(civ in mana_civs for civ in civs_spell) and card.spell_cost <= player.available_mana

        if can_cast_creature:
            play_as_creature(player, card, card_index, from_effect=from_effect)
        elif can_cast_spell:
            play_as_spell(player, card, card_index, from_effect=from_effect)
        return

    # 文明チェック
    if not any(
        civ in [civ for mana_card in player.mana_zone for civ in mana_card.civilizations]
        for civ in card.civilizations
    ):
        return

    # マナコストチェック
    if card.cost > player.available_mana:
        return

    # 実際にカードを使う
    player.available_mana -= card.cost
    if not from_effect:
        player.used_mana_this_turn = True  
    card = player.hand.pop(card_index)

    if card.card_type == "creature":
        summon_creature_to_battle_zone(player, card, card, from_effect=from_effect)

    elif card.card_type == "spell":
        if hasattr(card, "on_play") and callable(card.on_play):
            card.on_play(player)
        player.graveyard.append(card)

class ShieldTriggerPredictor:
    def __init__(self, deck, revealed_shields):
        self.deck = deck
        self.revealed = revealed_shields

    def sample_shields(self, count=5):
        # 既知のシールドを除いたカードからランダムに選ぶ（または枚数分決め打ちでもOK）
        return random.sample([c for c in self.deck if c not in self.revealed], count)

    def estimate_trigger_effect(self, card, player):
        """そのカードが与える除去数やブロック数を返す"""
        if not has_shield_trigger(card):
            return 0

        # 仮のルール例：
        if "ブロッカー" in card.abilities:
            return 1
        elif "G・ストライク" in card.abilities:
            return 1
        elif any(kw in "".join(card.abilities) for kw in ["破壊", "マナ", "バウンス"]):
            return 1  # ざっくり1体除去と仮定
        return 0

    def simulate_total_removal(self, player, simulations=10):
        """複数回試行して、除去/妨害の平均値を返す"""
        total = 0
        for _ in range(simulations):
            sampled = self.sample_shields()
            count = sum(self.estimate_trigger_effect(card, player) for card in sampled)
            total += count
        return total / simulations  # 平均除去数

import time

class RuleBasedAI:
    def __init__(self, player_id):
        self.player_id = player_id
    
    def should_add_to_hand(self, card, player):
        """
        AIがカードを手札に加えるべきか判定する。
        - 条件：cost <= len(mana_zone) + 2
        - ただし、boostカードがデッキ内に8枚以上あれば +3
        """
        boost_count = sum(1 for c in player.deck if getattr(c, "on_play", None) == boost)
        threshold = 3 if boost_count >= 8 else 2
        return card.cost <= len(player.mana_zone) + threshold

    def choose_mana_card(self, game):
        player = game.players[self.player_id]

        print(f"[DEBUG] choose_mana_card called for {player.name}, used_mana_this_turn = {player.used_mana_this_turn}")
    
        # 🔹 すでにチャージ済みならスキップ
        if player.used_mana_this_turn:
            print(f"[AI] {player.name} はこのターンすでにマナチャージしています。")
            return

        def get_card_cost(card):
            if isinstance(card, twimpact):
                return min(card.creature_cost, card.spell_cost)
            return card.cost or 99

        sorted_deck = sorted(player.deck, key=get_card_cost)
        top2_cost_cards = sorted_deck[:2] if len(sorted_deck) >= 2 else sorted_deck

        target_civilizations = set()
        for card in top2_cost_cards:
            if isinstance(card, twimpact):
                civs = set(card.creature_civilizations + card.spell_civilizations)
            else:
                civs = set(card.civilizations or [])
            target_civilizations.update(civs)

        candidates = []
        for card in player.hand:
            score = 0
            civilizations = getattr(card, 'civilizations', []) or []

            if any(civ in target_civilizations for civ in civilizations):
                score += 3

            if len(civilizations) >= 2 and game.turn_count == 0:
                score += 2

            card_cost = get_card_cost(card)
            score += abs(card_cost - len(player.mana_zone))

            same_count = sum(1 for c in player.hand if c.name == card.name)
            if same_count >= 2:
                score += 1

            candidates.append((score, card))

        if not candidates:
            print(f"[AI] {player.name} の手札にマナに置けるカードがない。")
            return

        candidates.sort(reverse=True, key=lambda x: x[0])
        selected_card = candidates[0][1]
        player.hand.remove(selected_card)
        player.mana_zone.append(selected_card)

        if hasattr(selected_card, 'civilizations') and len(selected_card.civilizations) == 1:
            player.available_mana += 1

        player.used_mana_this_turn = True  # 🔹 フラグ立てる！
        print(f"[AI] {player.name} は {selected_card.name} をマナゾーンに置いた。")
        


    def play_cards(self, game):
        player = game.players[self.player_id]

        boost_only = []
        multi_effect = []
        normal_cards = []
        spell_cards = []

        for card in list(player.hand):
            if card.card_type == "spell":
                spell_cards.append(card)
            elif hasattr(card, 'on_play'):
                if card.on_play == boost:
                    boost_only.append(card)
                elif card.name == "天災 デドダム":
                    multi_effect.append(card)
                else:
                    normal_cards.append(card)
            else:
                normal_cards.append(card)

        def get_cost(card):
            if isinstance(card, twimpact):
                return card.spell_cost if card.card_type == "spell" else card.creature_cost
            return card.cost or 99

        normal_cards.sort(key=get_cost, reverse=True)

        # デドダムを先に出すかどうか判定
        if multi_effect:
            potential_boost = any(
                c for c in multi_effect if "マナゾーン" in "".join(c.abilities)
            )
            if potential_boost:
                max_card_cost = get_cost(normal_cards[0]) if normal_cards else 0
                if max_card_cost == player.available_mana + 1:
                    card = multi_effect[0]
                    if card in player.hand:
                        play_card_for_ai(game, player, player.hand.index(card))
                        

        # 通常カード（クリーチャー）をプレイ
        for card in normal_cards:
            cost = get_cost(card)
            if cost <= player.available_mana and card in player.hand:
                play_card_for_ai(game, player, player.hand.index(card))
                
                break

        # 呪文カード（cast_spellを使う）
        for card in spell_cards:
            cost = get_cost(card)
            if cost <= player.available_mana and card in player.hand:
                player.available_mana -= card.cost
                player.used_mana_this_turn = True
                player.hand.remove(card)
                cast_spell(player, card, from_effect=False)
                break

        # ブースト専用カードを使用
        for card in boost_only:
            if card.cost <= player.available_mana and card in player.hand:
                play_card_for_ai(game, player, player.hand.index(card))
            


    def select_attacks(self, game):
        player = game.players[self.player_id]
        opponent = game.players[1 - self.player_id]
        attackers = [c for c in player.battle_zone if c.id not in player.summoned_creatures]
        attackers.sort(key=get_break_count)

        actions = []

        predictor = ShieldTriggerPredictor(opponent.deck, revealed_shields=[])
        estimated_removal = predictor.simulate_total_removal(player, simulations=10)

        def can_assemble_lethal_after_removal(attackers, estimated_removal, shield_count):
            scored = [(get_break_count(c), c.power, c.id) for c in attackers]
            survivors = scored[int(estimated_removal):]
            return sum(b for b, _, _ in survivors) >= shield_count

        def has_draw_or_summon_in_hand(player):
            for card in player.hand:
                if "カードを引く" in "".join(card.abilities) or "バトルゾーンに出す" in "".join(card.abilities):
                    return True
            return False

        def should_attack_creature(attacker, target):
            if attacker.power <= target.power:
                return False
            if getattr(target, "tapped", False) and "スピードアタッカー" not in "".join(attacker.abilities):
                return True
            return False

        # 1. リーサルを狙えるなら全員シールド攻撃
        if can_assemble_lethal_after_removal(attackers, estimated_removal, len(opponent.shields)):
            for attacker in attackers:
                actions.append((attacker, None))
            return actions

        # 2. 展開手段がないなら保険で攻撃
        if not has_draw_or_summon_in_hand(player):
            for attacker in attackers[:-int(estimated_removal)]:
                actions.append((attacker, None))
            return actions

        # 3. タップ状態のクリーチャーに殴れるなら優先
        for attacker in attackers:
            for target in opponent.battle_zone:
                if should_attack_creature(attacker, target):
                    actions.append((attacker, target))
                    return actions

        return actions  # 攻撃しない

    def attack(self, game):
        player = game.players[self.player_id]
        actions = self.select_attacks(game)

        for attacker, target in actions:
            # 攻撃時効果を処理
            if hasattr(attacker, "on_attack") and callable(attacker.on_attack):
                attacker.on_attack(player, game)

            # 攻撃実行
            if target:
                attack_target(game, attacker, target)
            else:
                attack_target(game, attacker)


AI_PLAYER_ID = 1
ai = RuleBasedAI(player_id=1)

def take_turn(game):
    player_id = game.turn_player
    player = game.players[player_id]

    if not game.turn_started:
        start_turn(game)
        game.turn_started = True

    # --- AIのターン ---
    if player_id == AI_PLAYER_ID:
        import time
        time.sleep(1.2)  # ← ここで1.2秒「AIターン状態」を維持！
        ai.choose_mana_card(game)
        ai.play_cards(game)
        ai.attack(game)
        end_turn(game)
        return
    # --- 人間プレイヤー ---
    if not game.turn_started:
        start_turn(game)
        game.turn_started = True

    choose_mana_card_H(game)

    while True:
        show_battle_zone(game)
        show_shields(game)

        action = input("プレイするカードのインデックスを入力（アタック:a ターン終了:e マナ確認:m 墓地確認:g）：").strip()
        if action.lower() == 'm':
            display_mana_zones(game)
        elif action.lower() == 'g':
            display_graveyards(game)


        if action.lower() == "e":
            end_turn(game)
            break

        elif action.lower() == "a":
            attack_phase(game)
            return 
        
        elif action.isdigit():
            card_index = int(action)
            player = game.players[game.turn_player]  # ✅ `current_player` ではなく `turn_player` を使用

            if 0 <= card_index < len(player.hand):
                play_card_H(game, card_index)  # **player は渡さない**
            else:
                print("無効なインデックスです。もう一度入力してください。\n")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

# デバッグモードを有効化
app.debug = True

game = create_initial_game()

# ==== flask用コード ======

@app.route('/api/drop_card', methods=['POST'])
def drop_card():
    data = request.get_json()
    card_id = data.get('cardId')
    zone = data.get('zone')
    player = game.players[game.turn_player]

    print(f"[DEBUG][SERVER] drop_card called with zone={zone!r}, cardId={card_id!r}")

    # 手札から対象カードを取得
    card = next((c for c in player.hand if c.id == card_id), None)
    if not card:
        return jsonify({
            'error': 'Card not found',
            'hand': [c.to_dict() for c in player.hand],
            'used_mana_this_turn': getattr(player, 'used_mana_this_turn', False),
            'mana_zone': [c.to_dict() for c in player.mana_zone],
        }), 404

    # バトルゾーンに置く場合
    if zone == 'battle':
        # ■ ツインパクト選択処理
        if getattr(card, 'card_type', None) == "twimpact":
            if not game.pending_choice:
                game.pending_choice         = True
                game.pending_choice_player  = game.turn_player
                game.choice_candidates      = [card]
                game.choice_purpose         = "twimpact_mode"
            return jsonify({'status': 'pending_twimpact_choice'})

        # ■ クリーチャー or 呪文どちらで使うか判定（spellなら直接墓地/効果に行く前提）
        is_spell = getattr(card, 'card_type', None) == "spell"
        # ※ツインパクトでmodeを明示したい場合はここでmode判定を追加

        idx = player.hand.index(card)
        result = play_card_H(game, idx)
        if result == 'not_enough_mana':
            return jsonify({'error': 'not enough mana'}), 400
        if result == 'not_enough_civilization':
            return jsonify({'error': 'not enough civilization'}), 400

        # デドダム効果の選択待ち（手札⇔マナ振り分け）
        if getattr(game, 'pending_choice', False) and game.choice_purpose in ('hand', 'mana'):
            return jsonify({
                'status': 'pending_dedodam_choice',
                'choice_candidates': [c.to_dict() for c in game.choice_candidates],
                'choice_purpose': game.choice_purpose
            })

        # ここがポイント！！
        # - クリーチャーの場合：バトルゾーンに残るから従来通り
        # - 呪文の場合：使用した呪文カード自身
        if is_spell:
            last_played_card = card.to_dict()
        else:
            last_played_card = player.battle_zone[-1].to_dict()

        return jsonify({
            'status': 'ok',
            'last_played_card': last_played_card
        })

    # マナゾーンに置く場合
    elif zone == 'mana':
        if getattr(player, 'used_mana_this_turn', False):
            return jsonify({'error': 'Mana already charged this turn'}), 400
        player.hand.remove(card)
        player.mana_zone.append(card)
        player.used_mana_this_turn = True
        if hasattr(card, 'civilizations') and len(card.civilizations) == 1:
            player.available_mana += 1
        return jsonify({
            'status': 'ok',
            'last_played_card': card.to_dict()
        })

    elif zone == 'no-zone':
        player.hand.remove(card)
        player.no_zone.append(card)
        return jsonify({'status': 'ok', 'last_played_card': card.to_dict()})

    # その他のゾーン不明
    else:
        return jsonify({'error': f'Unknown zone: {zone}'}), 400

@app.route('/api/choose_card', methods=['POST'])
def choose_card():
    print("[choose_card]",
          "pending_choice:", game.pending_choice,
          "pending_choice_player:", getattr(game, 'pending_choice_player', None),
          "purpose:",           getattr(game, 'choice_purpose', None),
          "candidates:",        [c.name for c in getattr(game, 'choice_candidates', [])])

    if not getattr(game, 'pending_choice', False):
        return jsonify({'error': 'no pending choice'}), 400

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
        return jsonify({'error': 'card not found'}), 400

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
            return jsonify({'status': 'pending_mana'})

        # ── 第2選択：2枚からマナへ（残り1枚は自動的に墓地へ） ──
        if len(top_cards) == 2 and zone == "mana":
            player.mana_zone.append(selected)
            # 残り1枚を墓地へ
            last = next(c for c in top_cards if c.id != card_id)
            player.graveyard.append(last)
            # クリーンアップ
            game.dedodam_state        = None
            clear_pending()
            return jsonify({'status': 'ok'})

        # ── 想定外ルート：選択されたカードを墓地へ ──
        player.graveyard.append(selected)
        game.dedodam_state = None
        clear_pending()
        return jsonify({'status': 'ok'})

    # ── フェーズ②：マルル二段階目効果の選択処理 ──
    if purpose == "hand_or_mana":
        if zone == "hand":
            player.hand.append(selected)
        else:
            player.mana_zone.append(selected)
        clear_pending()
        return jsonify({'status': 'ok'})
    
    if purpose == "twimpact_mode":
        mode = data.get("mode")
        if mode not in ("creature", "spell"):
            clear_pending()
            return jsonify({'error': 'invalid mode'}), 400

        idx = next((i for i, c in enumerate(player.hand) if c.id == card_id), None)
        if idx is None:
            clear_pending()
            return jsonify({'error': 'card not found in hand'}), 400

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
            return jsonify({'error': f'exception in twimpact_mode: {e}'}), 500

        clear_pending()
        return jsonify({'status': 'ok', 'last_played_card': last_played_card})

    # ── 通常の hand/mana/grave ブロック ──
    if purpose == 'hand':
        player.hand.append(selected)
        clear_pending()
        return jsonify({'status': 'ok'})
    if purpose == 'mana':
        player.mana_zone.append(selected)
        clear_pending()
        return jsonify({'status': 'ok'})
    if purpose == 'grave':
        player.graveyard.append(selected)
        clear_pending()
        return jsonify({'status': 'ok'})

    # ── フォールバック ──
    clear_pending()
    return jsonify({'error': 'invalid purpose'}), 400

@app.route('/api/set_mana', methods=['POST'])
def set_mana():
    data = request.get_json()
    card_id = data.get('cardId')
    player = game.players[game.turn_player]

    if any(c.id == card_id for c in player.mana_zone):
        return jsonify({'status': 'already_added'})

    card = next((c for c in player.hand if c.id == card_id), None)
    if not card:
        return jsonify({'error': 'Card not found in hand'}), 404

    player.hand.remove(card)
    player.mana_zone.append(card)
    if hasattr(card, 'civilizations') and len(card.civilizations) == 1:
        player.available_mana += 1

    return jsonify({'status': 'ok'})

@app.route('/api/state', methods=['GET'])
def get_state():
    # 自分（常にplayer1=0）視点
    me = game.players[0]
    opponent = game.players[1]

    # ここでターン開始処理
    if game.turn_player == 0 and not game.turn_started:
        start_turn(game)
        game.turn_started = True

    def zone_to_list(zone, attacked_creatures=None):
        return [card.to_dict(attacked_creatures=attacked_creatures) for card in zone]

    data = {
        'battle_zone': zone_to_list(me.battle_zone, attacked_creatures=me.attacked_creatures),
        'hand': zone_to_list(me.hand),
        'mana_zone': zone_to_list(me.mana_zone),
        'available_mana': me.available_mana,
        'shield_zone': zone_to_list(me.shields),
        'graveyard': zone_to_list(me.graveyard),
        'no_zone': zone_to_list(me.no_zone), 
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

    return Response(json.dumps(data, ensure_ascii=False), mimetype='application/json')

@app.route('/api/end_turn', methods=['POST'])
def end_turn_api():
    end_turn(game)
    current_player = game.players[game.turn_player]
    if getattr(current_player, "is_ai", False):
        # ここでAIターンに突入したことだけ返し、「AIの行動は後から行う」方式にする
        # → 一時的にAI行動をスキップ
        return jsonify({'status': 'ai_turn'})
    return jsonify({'status': 'ok'})

# Flask 側
@app.route('/api/ai_take_turn', methods=['POST'])
def ai_take_turn():
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
    return jsonify({'status': 'ok'})

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
        return jsonify(success=False, message="攻撃元カードが見つかりません"), 400

    # クリーチャーへの攻撃
    if target and target in opponent.battle_zone:
        attack_target(game, attacker, target)
    # シールドへの攻撃
    elif target and target in opponent.shields:
        attack_target(game, attacker, None)
    else:
        return jsonify(success=False, message="攻撃対象が見つかりません"), 400

    return jsonify(success=True)

@app.route('/api/attack_shield', methods=['POST'])
def attack_shield():
    data = request.get_json()
    attacker_id = data.get('attackerId')
    shield_id = data.get('shieldId')
    
    player = game.players[game.turn_player]
    opponent = game.players[1 - game.turn_player]

    print('attacker_id:', attacker_id)
    print('player.battle_zone:', [c.id for c in player.battle_zone])
    print('shield_id:', shield_id)
    print('opponent.shields:', [c.id for c in opponent.shields])
    
    # 攻撃するクリーチャーを探す
    attacker = next((c for c in player.battle_zone if c.id == attacker_id), None)
    if not attacker:
        return jsonify({'error': '攻撃するクリーチャーが見つかりません'}), 404
        
    # シールドを探す
    shield = next((c for c in opponent.shields if c.id == shield_id), None)
    if not shield:
        return jsonify({'error': '対象のシールドが見つかりません'}), 404
        
    # シールドを破壊
    opponent.shields.remove(shield)
    
    # シールドトリガーの処理
    trigger_used = resolve_shield_trigger(opponent, shield, game)
    
    if not trigger_used:
        opponent.hand.append(shield)
    
    # 攻撃済みフラグを設定
    player.attacked_creatures.append(attacker.id)
    
    return jsonify({'status': 'ok'})

@app.route('/api/mana_to_hand', methods=['POST'])
def mana_to_hand():
    data = request.get_json()
    card_id = data.get('cardId')
    player = game.players[game.turn_player]

    # マナゾーンからカードを探す
    card = next((c for c in player.mana_zone if c.id == card_id), None)
    if not card:
        return jsonify({'error': 'Card not found in mana zone'}), 404

    player.mana_zone.remove(card)
    player.hand.append(card)
    # 使用可能マナも調整（単色なら-1、多色はそのまま）
    if hasattr(card, 'civilizations') and len(card.civilizations) == 1:
        player.available_mana = max(0, player.available_mana - 1)

    return jsonify({'status': 'ok', 'last_added_card': card.to_dict()})

@app.route('/api/graveyard_to_mana', methods=['POST'])
def graveyard_to_mana():
    data = request.get_json()
    card_id = data.get('cardId')
    player = game.players[game.turn_player]

    # 墓地からカードを探す
    card = next((c for c in player.graveyard if c.id == card_id), None)
    if not card:
        return jsonify({'error': 'Card not found in graveyard'}), 404

    player.graveyard.remove(card)
    player.mana_zone.append(card)
    # 単色ならavailable_manaを+1
    if hasattr(card, 'civilizations') and len(card.civilizations) == 1:
        player.available_mana += 1

    return jsonify({'status': 'ok', 'last_added_card': card.to_dict()})

@app.route('/api/graveyard_to_hand', methods=['POST'])
def graveyard_to_hand():
    data = request.get_json()
    card_id = data.get('cardId')
    player = game.players[game.turn_player]

    # 墓地からカードを探す
    card = next((c for c in player.graveyard if c.id == card_id), None)
    if not card:
        return jsonify({'error': 'Card not found in graveyard'}), 404

    player.graveyard.remove(card)
    player.hand.append(card)

    return jsonify({'status': 'ok', 'last_added_card': card.to_dict()})

# 既存の /api/... 定義の下あたりに追記してください

@app.route('/api/card_action', methods=['POST'])
def card_action():
    data = request.get_json() or {}
    action = data.get('action')      # 'bounce' | 'destroy' | 'mana'
    card_id = data.get('cardId')
    player = game.players[game.turn_player]

    # バトルゾーンから対象カードを探す
    target = next((c for c in player.battle_zone if c.id == card_id), None)
    if not target:
        return jsonify({'error': 'Card not found in battle zone'}), 404

    # remove_creature 関数を呼び出し
    if action == 'destroy':
        remove_creature(player, target, kind='destroy')
    elif action == 'bounce':
        remove_creature(player, target, kind='bounce')
    elif action == 'mana':
        remove_creature(player, target, kind='mana_send')
    else:
        return jsonify({'error': 'Invalid action'}), 400

    # 状態を最新化して返却
    return jsonify({
        'status': 'ok',
        'battle_zone': [c.to_dict() for c in player.battle_zone],
        'mana_zone':    [c.to_dict() for c in player.mana_zone],
        'hand':         [c.to_dict() for c in player.hand],
        'graveyard':    [c.to_dict() for c in player.graveyard],
    })

if __name__ == '__main__':
    # このファイルはWebサーバーとして使うため、CUIのゲームループは削除します。
    # 代わりに、ローカルでのテスト用にFlaskの開発サーバーを起動する命令をここに置きます。
    # この部分はRenderでは実行されません。
    print("Flask 開発サーバーを http://0.0.0.0:5000 で起動します。")
    app.run(host='0.0.0.0', port=5000, debug=True)
from dm_core import create_initial_game, take_turn_ai

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
    from manual_debug import end_turn, twimpact
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

def play_card_H(game, card_index,from_effect=False):
    from manual_debug import play_as_creature, play_as_spell, summon_creature_to_battle_zone, cast_spell
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

def attack_phase(game):
    from manual_debug import end_turn, attack_target
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

def take_turn_H(game):
    from manual_debug import end_turn,  start_turn, choose_mana_card_H, play_card_H, attack_phase
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

if __name__ == "__main__":
    from app import game
    while True:
        player = game.players[game.turn_player]
        if hasattr(player, "is_ai") and player.is_ai:
            take_turn_ai(game)
        else:
            take_turn_H(game)
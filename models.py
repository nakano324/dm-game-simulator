from database import db # DM_game_system から db オブジェクトをインポート
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash # Userモデルで使う場合

# --- 3. データベースモデルの定義 (User, Deck) ---
# APIエンドポイントで参照されるため、API定義の前に置く
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # passwordをpassword_hashに変更
    password_hash = db.Column(db.String(256), nullable=False)
    
    decks = db.relationship('Deck', backref='author', lazy=True)

    # パスワードをハッシュ化して設定するメソッドを追加
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # 入力されたパスワードが正しいかチェックするメソッドを追加
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.email}>'
    

class Deck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cards_data = db.Column(db.Text, nullable=False) # カードのリストをJSON文字列として保存

    def __repr__(self):
        return f'<Deck {self.name}>'

class Game(db.Model):
    """１つの対戦セッション全体を管理するモデル"""
    id = db.Column(db.Integer, primary_key=True)
    
    # 参加しているプレイヤーの情報
    player1_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    player2_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # 現在のゲームの状態を丸ごとJSON形式のテキストで保存
    # これにより、複雑なゲームの状態をシンプルに保存・復元できる
    game_state_json = db.Column(db.Text, nullable=False)
    
    # 現在どちらのターンか (0 or 1)
    current_turn_player_id = db.Column(db.Integer, nullable=False)
    
    # ゲームのステータス（例: 'ongoing', 'finished'）
    status = db.Column(db.String(50), default='ongoing', nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Game {self.id} - P1:{self.player1_id} vs P2:{self.player2_id}>'


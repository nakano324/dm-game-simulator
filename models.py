from DM_game_system import db # DM_game_system から db オブジェクトをインポート
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash # Userモデルで使う場合

# --- 3. データベースモデルの定義 (User, Deck) ---
# APIエンドポイントで参照されるため、API定義の前に置く
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    
    decks = db.relationship('Deck', backref='author', lazy=True) 

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


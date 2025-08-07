import axios from 'axios';

// 開発中も本番公開後も、常にRenderのAPIサーバーを参照するようにURLを固定します。
const API_URL = 'https://dm-game-sim-api-new.onrender.com/api';


export const api = axios.create({
  baseURL: API_URL,
});

// リクエストインターセプター（リクエストを送信する前の共通処理）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    // トークンがあれば、Authorizationヘッダーに入館証としてセット
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
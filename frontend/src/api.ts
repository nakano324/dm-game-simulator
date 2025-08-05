import axios from 'axios';

// 開発中も本番公開後も、常にRenderのAPIサーバーを参照するようにURLを固定します。
const API_URL = 'https://dm-game-sim-api-new.onrender.com/api';


export const api = axios.create({
  baseURL: API_URL,
});
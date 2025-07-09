// src/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : '/api',
});

import { User } from './types';

const USERS_KEY = 'exchange_users';
const TOKEN_KEY = 'exchange_token';

function getUsers(): Record<string, User> {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : {};
}

function saveUsers(users: Record<string, User>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Simple JWT-like token (base64 encoded JSON)
function createToken(userId: string): string {
  const payload = { userId, exp: Date.now() + 24 * 60 * 60 * 1000 };
  return btoa(JSON.stringify(payload));
}

function decodeToken(token: string): { userId: string; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function login(username: string): { token: string; user: User } {
  const users = getUsers();
  const normalized = username.toLowerCase().trim();
  
  let user = Object.values(users).find(u => u.username.toLowerCase() === normalized);
  
  if (!user) {
    user = {
      id: generateId(),
      username: normalized,
      btcBalance: 100,
      usdBalance: 100000,
    };
    users[user.id] = user;
    saveUsers(users);
  }

  const token = createToken(user.id);
  localStorage.setItem(TOKEN_KEY, token);
  return { token, user };
}

export function getSession(): User | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  const users = getUsers();
  return users[payload.userId] || null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUser(userId: string): User | null {
  const users = getUsers();
  return users[userId] || null;
}

export function updateUserBalance(userId: string, btcDelta: number, usdDelta: number) {
  const users = getUsers();
  if (users[userId]) {
    users[userId].btcBalance += btcDelta;
    users[userId].usdBalance += usdDelta;
    saveUsers(users);
  }
}

export function getUserBalance(userId: string): { btc: number; usd: number } {
  const users = getUsers();
  const u = users[userId];
  return u ? { btc: u.btcBalance, usd: u.usdBalance } : { btc: 0, usd: 0 };
}

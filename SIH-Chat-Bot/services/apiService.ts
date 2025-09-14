import type { ChatSession } from '../types';

// Mock API latency to simulate a network request
const API_LATENCY = 400;

/**
 * Simulates fetching chat sessions for a user from a backend.
 * Uses localStorage as a mock database.
 * @param userId - The ID of the user whose chats to fetch.
 * @returns A promise that resolves to an array of ChatSession objects.
 */
export const getChatsForUser = (userId: string): Promise<ChatSession[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const savedChats = localStorage.getItem(`chats_${userId}`);
      if (savedChats) {
        resolve(JSON.parse(savedChats));
      } else {
        resolve([]);
      }
    }, API_LATENCY);
  });
};

/**
 * Simulates saving chat sessions for a user to a backend.
 * Uses localStorage as a mock database.
 * @param userId - The ID of the user.
 * @param chats - The array of ChatSession objects to save.
 * @returns A promise that resolves when the save is complete.
 */
export const saveChatsForUser = (userId: string, chats: ChatSession[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        if (chats.length > 0) {
            localStorage.setItem(`chats_${userId}`, JSON.stringify(chats));
        } else {
            // If the user deletes all chats, remove the item from storage
            localStorage.removeItem(`chats_${userId}`);
        }
        resolve();
      } catch (error) {
        reject(new Error("Failed to save data to mock storage."));
      }
    }, API_LATENCY);
  });
};

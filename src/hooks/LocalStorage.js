import { useState } from "react";
// Hook from useHooks! (https://usehooks.com/useLocalStorage/)
export default function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      const parsedItem = item ? JSON.parse(item) : initialValue;

      if (typeof parsedItem === "object" && parsedItem !== null && "value" in parsedItem) {
       //  const now = new Date();
       // if (ttl && now.getTime() > parsedItem.expiry) {
          // If the item is expired, delete the item from storage
          // and return null
       //   window.localStorage.removeItem(key);
       //   return initialValue;
       // }
        return parsedItem.value;
      }
      // Parse stored json or if none return initialValue
      return parsedItem;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = value => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

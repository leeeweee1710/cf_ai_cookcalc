# AI-Assisted Coding Prompts

Below is the collected set of prompts used for building this project.

---

### 1.
```
Create a minimal user-identification system that uses only a URL parameter named id. When a visitor arrives without an id, generate a random 6-letter identifier and append it to the URL. Use this ID as the agent "name" in the chat backend so each unique ID loads an isolated chat history. Do not persist the ID anywhere except the URL (no cookies, no localStorage, no sessionStorage). Keep the implementation extremely lightweight; no security considerations necessary.
```

---

### 2.
```
Implement a shared countdown timer feature for each id group:  
- Provide two preset cooking timers: Rice – 10 minutes, Pasta – 12 minutes.  
- Users can also enter custom times at any moment.  
- Timer state (start, pause, remaining time) must be synchronized between all users sharing the same id.  
- The timer UI must exist in a standalone div separate from the AI chat interface.
```

---

### 3.
```
Enhance the cooking calculator by displaying helpful real-world cup conversions. For example, 1.65 cups is 1 cup + ½ cup + 2 tbsp. Implement a general-purpose conversion helper that produces readable cup/tablespoon breakdowns.
```

---

### 4.
```
Create a card-style UI component for a Fridge & Grocery Tracker. Users should be able to add structured items containing name, quantity, and expiry. All items must synchronize across users sharing the same id. Additionally, expose an internal tool so the AI agent can programmatically add items to the fridge when users ask.
```

---

### 5.
```
Fix bug causing cross-component resets:
- Setting a custom timer must no longer clear the fridge/grocery list.
- Adding items must not reset or restart the timer.
Also remove the Set Time button entirely; as soon as the user enters a number, update the timer immediately without additional interaction.
```

---

### 6.
```
Improve AI tool interpretation for setting timers. The AI should correctly understand natural expressions such as:
- Set a timer for 4 minutes 30 seconds
- 2 mins 10 sec
- 150 seconds
The timer should properly interpret mixed units and configure itself without forcing a conversion into whole minutes.
```

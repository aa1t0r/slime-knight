# Phaser RPG - Slime's Journey

A turn-based RPG where you play as a young slime monster, freshly born into the world. Your journey takes you through a vast landscape where you must defend yourself against ferocious creatures and hostile humans, all while learning what it means to survive.

Quick start:

```bash
cd /home/sonic/Projects/game
npm install
npm run dev
# open http://localhost:5173
```

## Story

You are a **slime**, a small gelatinous creature that has just awakened in this strange world. You must explore and fight to survive. You'll encounter various enemies including goblins, humans, and other creatures. You can choose to fight them (dodge their attacks), spare them, or run away.

## Gameplay

This project uses Phaser + TypeScript + Vite. The overworld is a tilemap where you move with WASD. The player (you, the slime!) moves in 4 directions and can trigger battles by pressing **B**.

### Enemies

**Goblins**: Green-skinned creatures that employ three types of attacks:
- **Dagger Throw**: The goblin hurls sharp daggers from the side or above, each dealing 4 damage. Stay alert and dodge them as they come from different angles.
- **Slash Attack**: A quick horizontal sweep across the battlefield dealing 5 damage. Time your evasion carefully.
- **Bomb Drop**: The goblin drops an explosive from above that detonates on impact, dealing 8 damage to anything nearby. The drop location is random within the battle arena.

### Battle System

Battles are turn-based and inspired by Undertale:

- A menu shows **Attack**, **Spare**, and **Run** options
- Choosing **Attack** damages the enemy; then that enemy gets a turn and launches a random attack pattern for you to dodge
- **Spare** lets you win without hurting the enemy
- **Run** exits the battle and returns to the overworld
- Multiple enemies can appear in a single battle; defeat each one in sequence to claim victory
- Player and enemy HP are shown at the top of the battle screen
- The game ends if your HP reaches zero

### Battle UI & Effects

- Full-screen animated background with a subtle pulsing effect improves contrast and focus
- The dodge box is enlarged (~3× larger) with more bullets distributed, giving you significantly more room to dodge
- Entering and exiting battles features smooth fade in/out transitions
- When enemies attack, use WASD to move your character (a white square) within the battle box to avoid incoming damage

### Overworld

- Map is expanded to 40×30 tiles with you (the slime) starting at the centre
- The camera follows you, always keeping the map's middle region in view
- World bounds automatically pad themselves if the browser viewport is larger than the map, keeping the map visually centered
- The game canvas resizes to fill the entire browser window and adapts to window resizing

**Visual Note**: Default tile colors are bright green (floor) and grey (walls). If you only see a black square, check the browser console for messages from `OverworldScene` (logs show map dimensions and debug border).
# slime-knight
# slime-knight

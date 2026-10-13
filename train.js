import { RandomForestClassifier } from 'ml-random-forest';
import fs from 'fs';

const trainingData = [
  [4.2, 1.8, 2.8, 1.9, 12, 0],
  [4.5, 2.0, 3.1, 2.1, 14, 0],
  [3.8, 3.5, 2.2, 1.2, 2, 1],
  [1.5, 4.2, 0.8, 0.9, -10, 2],
  [4.0, 2.1, 2.5, 1.8, 8, 0],
  [2.5, 2.8, 1.2, 1.5, 1, 1],
  [1.2, 4.5, 0.9, 0.7, -12, 2],
  [4.1, 2.2, 2.7, 2.0, 10, 0],
  [4.3, 1.9, 2.9, 1.8, 13, 0],
];

const features = trainingData.map(d => d.slice(0, -1));
const labels = trainingData.map(d => d[d.length - 1]);

console.log("🧠 Entraînement ROSA-BET AI...");
const rf = new RandomForestClassifier({ nEstimators: 100, maxDepth: 10, seed: 42 });
rf.train(features, labels);

const model = rf.toJSON();
fs.writeFileSync('model.json', JSON.stringify(model));
console.log("✅ model.json créé!");

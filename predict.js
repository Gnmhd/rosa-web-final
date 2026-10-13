import { RandomForestClassifier } from 'ml-random-forest';
import fs from 'fs';

export function analyzeMatch(stats) {
  try {
    if (!fs.existsSync('model.json')) {
      return { resultat: "Modèle pas encore entraîné", confiance: "0%", piege: "Lance train.js" };
    }
    const modelJson = JSON.parse(fs.readFileSync('model.json', 'utf8'));
    const rf = RandomForestClassifier.load(modelJson);
    const pred = rf.predict([stats])[0];
    const proba = rf.predictProbability([stats])[0];
    const confiance = Math.max(...proba) * 100;
    return {
      resultat: pred === 0? "Victoire Domicile" : pred === 1? "Nul" : "Victoire Extérieur",
      confiance: confiance.toFixed(1) + "%",
      piege: confiance < 60? "⚠️ MATCH PIÈGE" : "✅ Match analysable"
    };
  } catch(e) {
    return { resultat: "Erreur: " + e.message, confiance: "0%", piege: "" };
  }
}

const { RandomForestClassifier } = require('ml-random-forest');
const fs = require('fs');

function loadModel() {
  const modelJson = JSON.parse(fs.readFileSync('model.json', 'utf8'));
  return RandomForestClassifier.load(modelJson);
}

function analyzeMatch(stats) {
  const rf = loadModel();
  // stats = [formeDom, formeExt, butsDom, butsExt, diffClassement]
  const pred = rf.predict([stats])[0];
  const proba = rf.predictProbability([stats])[0];

  const confiance = Math.max(...proba) * 100;

  return {
    resultat: pred === 0? "Victoire Domicile" : pred === 1? "Nul" : "Victoire Extérieur",
    confiance: confiance.toFixed(1) + "%",
    proba: proba,
    piege: confiance < 60? "MATCH PIÈGE - À ÉVITER" : "Match analysable"
  };
}

// Exemple: Man City vs Ipswich
const manCityVsIpswich = [4.3, 1.9, 2.9, 1.8, 13];
console.log(analyzeMatch(manCityVsIpswich));

module.exports = { analyzeMatch };

# Hedera Medical Records System

Ce projet est une plateforme complète de gestion de dossiers médicaux sur la blockchain Hedera, intégrant des smart contracts Solidity pour l'identité patient, le contrôle d'accès et l'historique médical. Il s'adresse aux développeurs souhaitant déployer un système sécurisé et transparent pour la santé.

## Fonctionnalités principales

- **Gestion des identités patients** : Création, stockage et mise à jour des identités sur la blockchain.
- **Contrôle d'accès** : Attribution et révocation de permissions pour les professionnels de santé (médecins, infirmiers, pharmaciens, etc.).
- **Consultations et dossiers médicaux** : Enregistrement, modification, partage et signature numérique des consultations et actes médicaux.
- **Logs d'accès et audit** : Historique complet des accès et actions sur les dossiers.
- **Sécurité et conformité** : Chiffrement des données sensibles, gestion des rôles, conformité RGPD.

## Structure du projet

```
contracts/                # Smart contracts Solidity
  ├─ PatientIdentityContract.sol
  ├─ AccessControlContract.sol
  └─ MedicalRecordsContract.sol
scripts/                  # Scripts Node.js pour compilation, déploiement et tests
  ├─ compile.js
  ├─ deploy-patient-contract.js
  ├─ deploy-access-control.js
  ├─ deploy-complete-system.js
  ├─ test-access-control-offline.js
  ├─ test-medical-records-offline.js
  └─ test-offline.js
config/                   # Fichiers de configuration
Tache.md                  # Planification et tâches projet
.env                      # Variables d'environnement (non versionné)
.gitignore                # Exclusion des fichiers sensibles
```

## Déploiement

1. **Configurer l'environnement**
   - Créez un compte Hedera Testnet
   - Renseignez `OPERATOR_ID` et `OPERATOR_KEY` dans `.env`
2. **Installer les dépendances**
   ```bash
   npm install
   ```
3. **Compilation des trois contrats**
`node -e "import('./scripts/compile.js').then(m=>m.compileAllContracts())"`

4. **Test en offline des contrats**
   - PatientIdentityContract: `node -e "import('./scripts/test-offline.js').then(m=>m.runOfflineTests())"`
   - AccessControlContract: `node -e "import('./scripts/test-access-control-offline.js').then(m=>m.testAccessControlSystem())"`
   - MedicalRecordsContract: `node -e "import('./scripts/test-medical-records-offline.js').then(m=>m.testMedicalRecordsSystem())"`
   - Les trois contrats à la fois: `node -e "import('./scripts/test-complete-system-offline.js').then(m=>m.testCompleteSystemOffline())"`

5. **Déployer les contrats**
   - Déployer les trois contrats:`node -e "import('./scripts/deploy-complete-system.js').then(m=>m.deployCompleteSystem())"`

## Utilisation

- **Créer un compte Hedera** : `node CreateAccountDemo.js`
- **Tester les contrats** : Utilisez les scripts de test dans `scripts/`
- **API Backend** : Intégration possible via Hedera SDK pour Node.js

## Sécurité

- Les clés et identifiants sont stockés dans `.env` (jamais versionné)
- Les dossiers `node_modules`, `contracts/compiled`, `contracts/deployed` sont exclus du dépôt
- Permissions granulaires et logs d'accès pour audit

## Technologies

- Solidity, Hedera SDK JavaScript, Node.js
- OpenZeppelin pour la sécurité des contrats
- Mocha/Chai pour les tests unitaires

## Auteur
Ulrich Sossou — Spécialiste Blockchain Hedera
Contact : usossou57@gmail.com

---

> Objectif : Blockchain Hedera robuste et sécurisée pour révolutionner la santé en Afrique ! 🚀

import 'dotenv/config';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Compiler un contrat Solidity
 * @param {string} contractPath Chemin vers le contrat
 * @param {string} contractName Nom du contrat
 */
function compileContract(contractPath, contractName) {
    console.log(`🔨 Compilation de ${contractName}...`);
    
    try {
        // Lire le code source
        const contractSource = fs.readFileSync(contractPath, 'utf8');
        console.log(`✅ Code source lu depuis ${contractPath}`);
        
        // Configuration de compilation
        const input = {
            language: 'Solidity',
            sources: {
                [contractName + '.sol']: {
                    content: contractSource
                }
            },
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['abi', 'evm.bytecode.object', 'evm.gasEstimates']
                    }
                },
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        };
        
        // Compilation
        const compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));
        
        // Vérifier les erreurs
        if (compiledContract.errors) {
            const errors = compiledContract.errors.filter(error => error.severity === 'error');
            if (errors.length > 0) {
                console.error('❌ Erreurs de compilation:');
                errors.forEach(error => console.error(error.formattedMessage));
                return null;
            }
            
            // Afficher les warnings
            const warnings = compiledContract.errors.filter(error => error.severity === 'warning');
            if (warnings.length > 0) {
                console.warn('⚠️ Avertissements:');
                warnings.forEach(warning => console.warn(warning.formattedMessage));
            }
        }
        
        const contract = compiledContract.contracts[contractName + '.sol'][contractName];
        
        if (!contract) {
            console.error(`❌ Contrat ${contractName} non trouvé dans la compilation`);
            return null;
        }
        
        // Créer le dossier compiled s'il n'existe pas
        const compiledDir = path.join(__dirname, '..', 'contracts', 'compiled');
        if (!fs.existsSync(compiledDir)) {
            fs.mkdirSync(compiledDir, { recursive: true });
        }
        
        // Sauvegarder les résultats de compilation
        const contractData = {
            contractName: contractName,
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            gasEstimates: contract.evm.gasEstimates,
            compilationDate: new Date().toISOString()
        };
        
        // Écrire les fichiers
        const outputPath = path.join(compiledDir, `${contractName}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));
        
        // Sauvegarder aussi le bytecode séparément pour Hedera
        const bytecodePath = path.join(compiledDir, `${contractName}_bytecode.bin`);
        fs.writeFileSync(bytecodePath, contract.evm.bytecode.object);
        
        console.log(`✅ Compilation réussie!`);
        console.log(`📁 Fichiers sauvegardés:`);
        console.log(`   - ${outputPath}`);
        console.log(`   - ${bytecodePath}`);
        console.log(`📊 Taille du bytecode: ${contract.evm.bytecode.object.length / 2} bytes`);
        
        // Estimation du gas
        if (contract.evm.gasEstimates.creation) {
            console.log(`⛽ Gas estimé pour déploiement: ${contract.evm.gasEstimates.creation.totalCost}`);
        }
        
        return contractData;
        
    } catch (error) {
        console.error(`❌ Erreur lors de la compilation de ${contractName}:`, error.message);
        return null;
    }
}

/**
 * Compiler tous les contrats
 */
async function compileAllContracts() {
    console.log("🚀 Démarrage de la compilation des contrats...\n");
    
    const contractsDir = path.join(__dirname, '..', 'contracts');
    const contracts = [
        {
            name: 'PatientIdentityContract',
            path: path.join(contractsDir, 'PatientIdentityContract.sol')
        },
        {
            name: 'AccessControlContract',
            path: path.join(contractsDir, 'AccessControlContract.sol')
        },
        {
            name: 'MedicalRecordsContract',
            path: path.join(contractsDir, 'MedicalRecordsContract.sol')
        }
    ];
    
    const compiledContracts = [];
    
    for (const contract of contracts) {
        if (fs.existsSync(contract.path)) {
            console.log(`\n📋 Compilation de ${contract.name}:`);
            const compiled = compileContract(contract.path, contract.name);
            if (compiled) {
                compiledContracts.push(compiled);
                console.log(`✅ ${contract.name} compilé avec succès\n`);
            } else {
                console.log(`❌ Échec de compilation de ${contract.name}\n`);
            }
        } else {
            console.warn(`⚠️ Contrat non trouvé: ${contract.path}`);
        }
    }
    
    console.log(`🎉 Compilation terminée! ${compiledContracts.length} contrat(s) compilé(s) avec succès.`);
    return compiledContracts;
}

// Exécuter la compilation si ce script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    compileAllContracts().catch(console.error);
}

export { compileContract, compileAllContracts };

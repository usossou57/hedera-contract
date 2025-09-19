// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PatientIdentityContract {
    
    // Structure pour stocker les informations patient
    struct Patient {
        uint256 patientId;
        string encryptedPersonalData; // Hash des données personnelles chiffrées
        address patientAddress;
        bool isActive;
        uint256 creationDate;
        string metadataHash; // Hash IPFS pour métadonnées additionnelles
    }
    
    // Mappings pour l'accès aux données
    mapping(address => uint256) public addressToPatientId;
    mapping(uint256 => Patient) public patients;
    mapping(uint256 => mapping(address => bool)) public accessPermissions;
    
    // Compteur pour les IDs patients
    uint256 public nextPatientId = 1;
    
    // Événements pour traçabilité
    event PatientRegistered(
        uint256 indexed patientId, 
        address indexed patientAddress, 
        uint256 timestamp
    );
    
    event PatientDataUpdated(
        uint256 indexed patientId, 
        address indexed updatedBy, 
        uint256 timestamp
    );
    
    event AccessGranted(
        uint256 indexed patientId, 
        address indexed grantedTo, 
        address indexed grantedBy
    );
    
    event AccessRevoked(
        uint256 indexed patientId, 
        address indexed revokedFrom, 
        address indexed revokedBy
    );
    
    // Modificateurs pour contrôle d'accès
    modifier onlyPatient(uint256 _patientId) {
        require(
            patients[_patientId].patientAddress == msg.sender, 
            "Seul le patient peut effectuer cette action"
        );
        _;
    }
    
    modifier patientExists(uint256 _patientId) {
        require(
            patients[_patientId].isActive, 
            "Patient inexistant ou inactif"
        );
        _;
    }
    
    modifier hasAccess(uint256 _patientId) {
        require(
            patients[_patientId].patientAddress == msg.sender || 
            accessPermissions[_patientId][msg.sender],
            "Acces non autorise"
        );
        _;
    }
    
    /**
     * @dev Enregistrer un nouveau patient
     * @param _encryptedData Hash des données personnelles chiffrées
     * @param _metadataHash Hash IPFS pour métadonnées
     * @return patientId ID unique du patient créé
     */
    function registerPatient(
        string memory _encryptedData, 
        string memory _metadataHash
    ) public returns (uint256) {
        require(
            addressToPatientId[msg.sender] == 0, 
            "Patient deja enregistre avec cette adresse"
        );
        require(
            bytes(_encryptedData).length > 0, 
            "Donnees chiffrees requises"
        );
        
        uint256 patientId = nextPatientId;
        
        patients[patientId] = Patient({
            patientId: patientId,
            encryptedPersonalData: _encryptedData,
            patientAddress: msg.sender,
            isActive: true,
            creationDate: block.timestamp,
            metadataHash: _metadataHash
        });
        
        addressToPatientId[msg.sender] = patientId;
        nextPatientId++;
        
        emit PatientRegistered(patientId, msg.sender, block.timestamp);
        return patientId;
    }
    
    /**
     * @dev Mettre à jour les données d'un patient
     * @param _patientId ID du patient
     * @param _encryptedData Nouvelles données chiffrées
     * @param _metadataHash Nouveau hash de métadonnées
     */
    function updatePatientData(
        uint256 _patientId,
        string memory _encryptedData,
        string memory _metadataHash
    ) public onlyPatient(_patientId) patientExists(_patientId) {
        require(
            bytes(_encryptedData).length > 0, 
            "Donnees chiffrees requises"
        );
        
        patients[_patientId].encryptedPersonalData = _encryptedData;
        patients[_patientId].metadataHash = _metadataHash;
        
        emit PatientDataUpdated(_patientId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Obtenir les informations d'un patient
     * @param _patientId ID du patient
     * @return Patient Structure complète du patient
     */
    function getPatientInfo(uint256 _patientId) 
        public 
        view 
        hasAccess(_patientId) 
        patientExists(_patientId) 
        returns (Patient memory) 
    {
        return patients[_patientId];
    }
    
    /**
     * @dev Accorder l'accès à un médecin ou autre professionnel
     * @param _patientId ID du patient
     * @param _authorizedAddress Adresse à autoriser
     */
    function grantAccess(uint256 _patientId, address _authorizedAddress) 
        public 
        onlyPatient(_patientId) 
        patientExists(_patientId) 
    {
        require(_authorizedAddress != address(0), "Adresse invalide");
        require(
            !accessPermissions[_patientId][_authorizedAddress],
            "Acces deja accorde"
        );
        
        accessPermissions[_patientId][_authorizedAddress] = true;
        
        emit AccessGranted(_patientId, _authorizedAddress, msg.sender);
    }
    
    /**
     * @dev Révoquer l'accès d'un médecin ou autre professionnel
     * @param _patientId ID du patient
     * @param _addressToRevoke Adresse dont révoquer l'accès
     */
    function revokeAccess(uint256 _patientId, address _addressToRevoke) 
        public 
        onlyPatient(_patientId) 
        patientExists(_patientId) 
    {
        require(_addressToRevoke != address(0), "Adresse invalide");
        require(
            accessPermissions[_patientId][_addressToRevoke],
            "Acces non accorde"
        );
        
        accessPermissions[_patientId][_addressToRevoke] = false;
        
        emit AccessRevoked(_patientId, _addressToRevoke, msg.sender);
    }
    
    /**
     * @dev Vérifier si une adresse a accès aux données d'un patient
     * @param _patientId ID du patient
     * @param _address Adresse à vérifier
     * @return bool Vrai si l'accès est autorisé
     */
    function checkAccess(uint256 _patientId, address _address) 
        public 
        view 
        patientExists(_patientId) 
        returns (bool) 
    {
        return patients[_patientId].patientAddress == _address || 
               accessPermissions[_patientId][_address];
    }
    
    /**
     * @dev Désactiver un compte patient (ne supprime pas les données)
     * @param _patientId ID du patient
     */
    function deactivatePatient(uint256 _patientId) 
        public 
        onlyPatient(_patientId) 
        patientExists(_patientId) 
    {
        patients[_patientId].isActive = false;
    }
    
    /**
     * @dev Obtenir le nombre total de patients enregistrés
     * @return uint256 Nombre de patients
     */
    function getTotalPatients() public view returns (uint256) {
        return nextPatientId - 1;
    }
    
    /**
     * @dev Obtenir l'ID patient depuis une adresse
     * @param _patientAddress Adresse du patient
     * @return uint256 ID du patient (0 si non trouvé)
     */
    function getPatientIdByAddress(address _patientAddress) 
        public 
        view 
        returns (uint256) 
    {
        return addressToPatientId[_patientAddress];
    }
}
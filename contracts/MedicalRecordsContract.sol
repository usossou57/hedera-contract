// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MedicalRecordsContract {
    
    // Énumération des types d'enregistrements
    enum RecordType { 
        CONSULTATION, 
        PRESCRIPTION, 
        TEST_RESULT, 
        SURGERY, 
        VACCINATION, 
        EMERGENCY,
        FOLLOW_UP,
        DISCHARGE_SUMMARY
    }
    
    // Énumération des statuts
    enum RecordStatus { 
        DRAFT, 
        FINALIZED, 
        AMENDED, 
        CANCELLED 
    }
    
    // Structure pour un enregistrement médical
    struct MedicalRecord {
        uint256 recordId;
        uint256 patientId;
        address doctorAddress;
        RecordType recordType;
        RecordStatus status;
        string encryptedDataHash;    // Hash IPFS des données chiffrées
        string originalDataHash;     // Hash des données originales pour intégrité
        uint256 timestamp;
        uint256 lastModified;
        string[] attachmentHashes;   // Hashes IPFS des pièces jointes
        string metadata;             // Métadonnées additionnelles
        bool isEmergency;
        address[] authorizedViewers; // Qui peut voir cet enregistrement
    }
    
    // Structure pour l'amendement d'un enregistrement
    struct Amendment {
        uint256 amendmentId;
        uint256 originalRecordId;
        address amendedBy;
        string reason;
        string newEncryptedDataHash;
        uint256 amendmentDate;
        bool isActive;
    }
    
    // Structure pour les signatures numériques
    struct DigitalSignature {
        address signer;
        uint256 recordId;
        bytes signature;
        uint256 signatureDate;
        string signerRole;
    }
    
    // Mappings
    mapping(uint256 => MedicalRecord) public medicalRecords;
    mapping(uint256 => uint256[]) public patientRecords; // Records par patient
    mapping(address => uint256[]) public doctorRecords;  // Records par docteur
    mapping(uint256 => Amendment[]) public recordAmendments;
    mapping(uint256 => DigitalSignature[]) public recordSignatures;
    mapping(bytes32 => bool) public usedHashes; // Protection contre la duplication
    
    // Compteurs
    uint256 public nextRecordId = 1;
    uint256 public nextAmendmentId = 1;
    
    // Contrats liés
    address public patientIdentityContract;
    address public accessControlContract;
    
    // Événements
    event MedicalRecordCreated(
        uint256 indexed recordId,
        uint256 indexed patientId,
        address indexed doctorAddress,
        RecordType recordType
    );
    
    event MedicalRecordAmended(
        uint256 indexed recordId,
        uint256 indexed amendmentId,
        address indexed amendedBy,
        string reason
    );
    
    event MedicalRecordSigned(
        uint256 indexed recordId,
        address indexed signer,
        string signerRole
    );
    
    event RecordStatusChanged(
        uint256 indexed recordId,
        RecordStatus oldStatus,
        RecordStatus newStatus
    );
    
    event EmergencyRecordCreated(
        uint256 indexed recordId,
        uint256 indexed patientId,
        address indexed doctorAddress
    );
    
    event RecordShared(
        uint256 indexed recordId,
        address indexed sharedWith,
        address indexed sharedBy
    );
    
    // Modificateurs
    modifier onlyAuthorized(uint256 _recordId) {
        MedicalRecord memory record = medicalRecords[_recordId];
        require(
            record.doctorAddress == msg.sender ||
            isAuthorizedViewer(_recordId, msg.sender) ||
            isPatientOwner(record.patientId, msg.sender),
            "Acces non autorise a cet enregistrement"
        );
        _;
    }
    
    modifier recordExists(uint256 _recordId) {
        require(medicalRecords[_recordId].recordId != 0, "Enregistrement inexistant");
        _;
    }
    
    modifier onlyDoctor() {
        require(isDoctorOrAuthorized(msg.sender), "Seuls les medecins autorises");
        _;
    }
    
    /**
     * @dev Constructeur
     * @param _patientIdentityContract Adresse du contrat Patient
     * @param _accessControlContract Adresse du contrat Access Control
     */
    constructor(
        address _patientIdentityContract,
        address _accessControlContract
    ) {
        patientIdentityContract = _patientIdentityContract;
        accessControlContract = _accessControlContract;
    }
    
    /**
     * @dev Créer un nouvel enregistrement médical
     * @param _patientId ID du patient
     * @param _recordType Type d'enregistrement
     * @param _encryptedDataHash Hash des données chiffrées
     * @param _originalDataHash Hash original pour intégrité
     * @param _attachmentHashes Hashes des pièces jointes
     * @param _metadata Métadonnées
     * @param _isEmergency Si c'est un cas d'urgence
     */
    function createMedicalRecord(
        uint256 _patientId,
        RecordType _recordType,
        string memory _encryptedDataHash,
        string memory _originalDataHash,
        string[] memory _attachmentHashes,
        string memory _metadata,
        bool _isEmergency
    ) public onlyDoctor returns (uint256) {
        require(_patientId > 0, "ID patient invalide");
        require(bytes(_encryptedDataHash).length > 0, "Hash des donnees requis");
        require(bytes(_originalDataHash).length > 0, "Hash original requis");
        
        // Vérifier que le hash n'a pas déjà été utilisé
        bytes32 hashKey = keccak256(abi.encodePacked(_originalDataHash, _patientId));
        require(!usedHashes[hashKey], "Enregistrement deja existant");
        
        uint256 recordId = nextRecordId;
        
        // Créer l'enregistrement
        medicalRecords[recordId] = MedicalRecord({
            recordId: recordId,
            patientId: _patientId,
            doctorAddress: msg.sender,
            recordType: _recordType,
            status: _isEmergency ? RecordStatus.FINALIZED : RecordStatus.DRAFT,
            encryptedDataHash: _encryptedDataHash,
            originalDataHash: _originalDataHash,
            timestamp: block.timestamp,
            lastModified: block.timestamp,
            attachmentHashes: _attachmentHashes,
            metadata: _metadata,
            isEmergency: _isEmergency,
            authorizedViewers: new address[](0)
        });
        
        // Ajouter aux index
        patientRecords[_patientId].push(recordId);
        doctorRecords[msg.sender].push(recordId);
        
        // Marquer le hash comme utilisé
        usedHashes[hashKey] = true;
        
        nextRecordId++;
        
        // Émettre les événements
        emit MedicalRecordCreated(recordId, _patientId, msg.sender, _recordType);
        
        if (_isEmergency) {
            emit EmergencyRecordCreated(recordId, _patientId, msg.sender);
        }
        
        return recordId;
    }
    
    /**
     * @dev Amender un enregistrement médical
     * @param _recordId ID de l'enregistrement
     * @param _newEncryptedDataHash Nouveau hash des données
     * @param _reason Raison de l'amendement
     */
    function amendMedicalRecord(
        uint256 _recordId,
        string memory _newEncryptedDataHash,
        string memory _reason
    ) public recordExists(_recordId) returns (uint256) {
        MedicalRecord storage record = medicalRecords[_recordId];
        
        require(
            record.doctorAddress == msg.sender,
            "Seul le medecin createur peut amender"
        );
        require(
            record.status != RecordStatus.CANCELLED,
            "Impossible d'amender un enregistrement annule"
        );
        require(bytes(_reason).length > 0, "Raison d'amendement requise");
        
        uint256 amendmentId = nextAmendmentId;
        
        // Créer l'amendement
        recordAmendments[_recordId].push(Amendment({
            amendmentId: amendmentId,
            originalRecordId: _recordId,
            amendedBy: msg.sender,
            reason: _reason,
            newEncryptedDataHash: _newEncryptedDataHash,
            amendmentDate: block.timestamp,
            isActive: true
        }));
        
        // Mettre à jour l'enregistrement
        record.encryptedDataHash = _newEncryptedDataHash;
        record.status = RecordStatus.AMENDED;
        record.lastModified = block.timestamp;
        
        nextAmendmentId++;
        
        emit MedicalRecordAmended(_recordId, amendmentId, msg.sender, _reason);
        
        return amendmentId;
    }
    
    /**
     * @dev Finaliser un enregistrement
     * @param _recordId ID de l'enregistrement
     */
    function finalizeRecord(uint256 _recordId) 
        public 
        recordExists(_recordId) 
    {
        MedicalRecord storage record = medicalRecords[_recordId];
        
        require(record.doctorAddress == msg.sender, "Seul le createur peut finaliser");
        require(record.status == RecordStatus.DRAFT, "Seuls les brouillons peuvent etre finalises");
        
        RecordStatus oldStatus = record.status;
        record.status = RecordStatus.FINALIZED;
        record.lastModified = block.timestamp;
        
        emit RecordStatusChanged(_recordId, oldStatus, RecordStatus.FINALIZED);
    }
    
    /**
     * @dev Signer numériquement un enregistrement
     * @param _recordId ID de l'enregistrement
     * @param _signature Signature numérique
     * @param _signerRole Rôle du signataire
     */
    function signRecord(
        uint256 _recordId,
        bytes memory _signature,
        string memory _signerRole
    ) public recordExists(_recordId) onlyDoctor {
        require(_signature.length > 0, "Signature requise");
        require(bytes(_signerRole).length > 0, "Role du signataire requis");
        
        recordSignatures[_recordId].push(DigitalSignature({
            signer: msg.sender,
            recordId: _recordId,
            signature: _signature,
            signatureDate: block.timestamp,
            signerRole: _signerRole
        }));
        
        emit MedicalRecordSigned(_recordId, msg.sender, _signerRole);
    }
    
    /**
     * @dev Partager un enregistrement avec un professionnel
     * @param _recordId ID de l'enregistrement
     * @param _authorizedViewer Adresse à autoriser
     */
    function shareRecord(uint256 _recordId, address _authorizedViewer) 
        public 
        recordExists(_recordId) 
    {
        MedicalRecord storage record = medicalRecords[_recordId];
        
        require(
            record.doctorAddress == msg.sender || 
            isPatientOwner(record.patientId, msg.sender),
            "Non autorise a partager cet enregistrement"
        );
        require(_authorizedViewer != address(0), "Adresse invalide");
        
        // Vérifier que l'utilisateur n'est pas déjà autorisé
        for (uint i = 0; i < record.authorizedViewers.length; i++) {
            require(
                record.authorizedViewers[i] != _authorizedViewer,
                "Utilisateur deja autorise"
            );
        }
        
        record.authorizedViewers.push(_authorizedViewer);
        
        emit RecordShared(_recordId, _authorizedViewer, msg.sender);
    }
    
    /**
     * @dev Obtenir un enregistrement médical
     * @param _recordId ID de l'enregistrement
     * @return MedicalRecord Structure complète
     */
    function getMedicalRecord(uint256 _recordId) 
        public 
        view 
        recordExists(_recordId)
        onlyAuthorized(_recordId)
        returns (MedicalRecord memory) 
    {
        return medicalRecords[_recordId];
    }
    
    /**
     * @dev Obtenir l'historique médical d'un patient
     * @param _patientId ID du patient
     * @return uint256[] Liste des IDs d'enregistrements
     */
    function getPatientHistory(uint256 _patientId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        require(
            isPatientOwner(_patientId, msg.sender) ||
            isDoctorOrAuthorized(msg.sender),
            "Acces non autorise a l'historique"
        );
        
        return patientRecords[_patientId];
    }
    
    /**
     * @dev Obtenir les enregistrements créés par un médecin
     * @param _doctorAddress Adresse du médecin
     * @return uint256[] Liste des IDs d'enregistrements
     */
    function getDoctorRecords(address _doctorAddress) 
        public 
        view 
        returns (uint256[] memory) 
    {
        require(
            _doctorAddress == msg.sender ||
            isDoctorOrAuthorized(msg.sender),
            "Acces non autorise"
        );
        
        return doctorRecords[_doctorAddress];
    }
    
    /**
     * @dev Obtenir les amendements d'un enregistrement
     * @param _recordId ID de l'enregistrement
     * @return Amendment[] Liste des amendements
     */
    function getRecordAmendments(uint256 _recordId) 
        public 
        view 
        recordExists(_recordId)
        onlyAuthorized(_recordId)
        returns (Amendment[] memory) 
    {
        return recordAmendments[_recordId];
    }
    
    /**
     * @dev Obtenir les signatures d'un enregistrement
     * @param _recordId ID de l'enregistrement
     * @return DigitalSignature[] Liste des signatures
     */
    function getRecordSignatures(uint256 _recordId) 
        public 
        view 
        recordExists(_recordId)
        onlyAuthorized(_recordId)
        returns (DigitalSignature[] memory) 
    {
        return recordSignatures[_recordId];
    }
    
    /**
     * @dev Rechercher des enregistrements par type
     * @param _patientId ID du patient
     * @param _recordType Type d'enregistrement recherché
     * @return uint256[] Liste des IDs d'enregistrements
     */
    function getRecordsByType(uint256 _patientId, RecordType _recordType) 
        public 
        view 
        returns (uint256[] memory) 
    {
        require(
            isPatientOwner(_patientId, msg.sender) ||
            isDoctorOrAuthorized(msg.sender),
            "Acces non autorise"
        );
        
        uint256[] memory patientRecordIds = patientRecords[_patientId];
        uint256 count = 0;
        
        // Compter les enregistrements du bon type
        for (uint i = 0; i < patientRecordIds.length; i++) {
            if (medicalRecords[patientRecordIds[i]].recordType == _recordType) {
                count++;
            }
        }
        
        // Créer le tableau de résultats
        uint256[] memory results = new uint256[](count);
        uint256 resultIndex = 0;
        
        for (uint i = 0; i < patientRecordIds.length; i++) {
            if (medicalRecords[patientRecordIds[i]].recordType == _recordType) {
                results[resultIndex] = patientRecordIds[i];
                resultIndex++;
            }
        }
        
        return results;
    }
    
    /**
     * @dev Obtenir les enregistrements d'urgence
     * @param _patientId ID du patient
     * @return uint256[] Liste des IDs d'enregistrements d'urgence
     */
    function getEmergencyRecords(uint256 _patientId) 
        public 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory patientRecordIds = patientRecords[_patientId];
        uint256 count = 0;
        
        // Compter les enregistrements d'urgence
        for (uint i = 0; i < patientRecordIds.length; i++) {
            if (medicalRecords[patientRecordIds[i]].isEmergency) {
                count++;
            }
        }
        
        // Créer le tableau de résultats
        uint256[] memory results = new uint256[](count);
        uint256 resultIndex = 0;
        
        for (uint i = 0; i < patientRecordIds.length; i++) {
            if (medicalRecords[patientRecordIds[i]].isEmergency) {
                results[resultIndex] = patientRecordIds[i];
                resultIndex++;
            }
        }
        
        return results;
    }
    
    /**
     * @dev Vérifier l'intégrité d'un enregistrement
     * @param _recordId ID de l'enregistrement
     * @param _originalHash Hash original pour vérification
     * @return bool Vrai si l'intégrité est préservée
     */
    function verifyRecordIntegrity(uint256 _recordId, string memory _originalHash) 
        public 
        view 
        recordExists(_recordId)
        returns (bool) 
    {
        return keccak256(bytes(medicalRecords[_recordId].originalDataHash)) == 
               keccak256(bytes(_originalHash));
    }
    
    /**
     * @dev Annuler un enregistrement
     * @param _recordId ID de l'enregistrement
     * @param _reason Raison de l'annulation
     */
    function cancelRecord(uint256 _recordId, string memory _reason) 
        public 
        recordExists(_recordId) 
    {
        MedicalRecord storage record = medicalRecords[_recordId];
        
        require(
            record.doctorAddress == msg.sender,
            "Seul le createur peut annuler"
        );
        require(
            record.status != RecordStatus.CANCELLED,
            "Enregistrement deja annule"
        );
        require(bytes(_reason).length > 0, "Raison d'annulation requise");
        
        RecordStatus oldStatus = record.status;
        record.status = RecordStatus.CANCELLED;
        record.lastModified = block.timestamp;
        record.metadata = string(abi.encodePacked(record.metadata, " | CANCELLED: ", _reason));
        
        emit RecordStatusChanged(_recordId, oldStatus, RecordStatus.CANCELLED);
    }
    
    /**
     * @dev Obtenir le nombre total d'enregistrements
     * @return uint256 Nombre total
     */
    function getTotalRecords() public view returns (uint256) {
        return nextRecordId - 1;
    }
    
    /**
     * @dev Obtenir le nombre d'enregistrements par patient
     * @param _patientId ID du patient
     * @return uint256 Nombre d'enregistrements
     */
    function getPatientRecordCount(uint256 _patientId) 
        public 
        view 
        returns (uint256) 
    {
        return patientRecords[_patientId].length;
    }
    
    /**
     * @dev Fonctions utilitaires internes
     */
    function isAuthorizedViewer(uint256 _recordId, address _viewer) 
        internal 
        view 
        returns (bool) 
    {
        MedicalRecord memory record = medicalRecords[_recordId];
        for (uint i = 0; i < record.authorizedViewers.length; i++) {
            if (record.authorizedViewers[i] == _viewer) {
                return true;
            }
        }
        return false;
    }
    
    function isPatientOwner(uint256 /*_patientId*/, address /*_address*/) 
        internal 
        pure
        returns (bool) 
    {
        // Appel vers PatientIdentityContract - simplifié pour l'exemple
        return true; // À implémenter avec appel inter-contrat
    }
    
    function isDoctorOrAuthorized(address /*_address*/) 
        internal 
        pure 
        returns (bool) 
    {
        // Appel vers AccessControlContract - simplifié pour l'exemple
        return true; // À implémenter avec appel inter-contrat
    }
    
    /*
     * @dev Obtenir des statistiques du contrat
     * @return Tuple avec les statistiques
     */
    function getContractStats() 
        public 
        view 
        returns (
            uint256 totalRecords,
            uint256 totalAmendments,
            uint256 emergencyRecords,
            uint256 cancelledRecords
        ) 
    {
        totalRecords = nextRecordId - 1;
        totalAmendments = nextAmendmentId - 1;
        
        uint256 emergencyCount = 0;
        uint256 cancelledCount = 0;
        
        for (uint256 i = 1; i < nextRecordId; i++) {
            if (medicalRecords[i].isEmergency) {
                emergencyCount++;
            }
            if (medicalRecords[i].status == RecordStatus.CANCELLED) {
                cancelledCount++;
            }
        }
        
        return (totalRecords, totalAmendments, emergencyCount, cancelledCount);
    }
}

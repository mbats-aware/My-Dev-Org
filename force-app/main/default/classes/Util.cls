public with sharing class Util {
    
    public static List<EntityDefinition> getEntities(string criteria){
        string q = 'SELECT Id, DurableId, LastModifiedDate, LastModifiedById, QualifiedApiName, NamespacePrefix, DeveloperName, MasterLabel, Label, '
            + ' PluralLabel, DefaultCompactLayoutId, IsCustomizable, IsApexTriggerable, IsWorkflowEnabled, IsProcessEnabled, IsCompactLayoutable, DeploymentStatus, KeyPrefix, IsCustomSetting, '
            + ' IsDeprecatedAndHidden, IsReplicateable, IsRetrieveable, IsSearchLayoutable, IsSearchable, IsTriggerable, IsIdEnabled, IsEverCreatable, IsEverUpdatable, IsEverDeletable, '
            + ' IsFeedEnabled, IsQueryable, IsMruEnabled, DetailUrl, EditUrl, NewUrl, EditDefinitionUrl, HelpSettingPageName, HelpSettingPageUrl, RunningUserEntityAccessId, PublisherId, '
            + ' IsLayoutable, RecordTypesSupported, InternalSharingModel, ExternalSharingModel, HasSubtypes, IsSubtype, IsAutoActivityCaptureEnabled, IsInterface, ImplementsInterfaces, '
            + ' ImplementedBy, ExtendsInterfaces, ExtendedBy, DefaultImplementation '
            + ' FROM EntityDefinition ';

        if(String.isNotBlank(criteria)){
            q += criteria;
        }

        return database.query(q);

    }

    public static List<EntityDefinition> getFields(string criteria){
        string q = 'SELECT Id, DurableId, QualifiedApiName, EntityDefinitionId, EntityDefinition.QualifiedApiName, NamespacePrefix, DeveloperName, MasterLabel, Label, '
            + ' Length, DataType, IsCalculated, IsHighScaleNumber, IsHtmlFormatted, IsNameField, IsListFilterable, IsListSortable, IsApiGroupable, IsListVisible, '
            + ' ControllingFieldDefinitionId, LastModifiedDate, LastModifiedById, PublisherId, RunningUserFieldAccessId, RelationshipName, ReferenceTo, ReferenceTargetField, '
            + ' IsCompound, IsSearchPrefilterable, IsPolymorphicForeignKey, IsAiPredictionField, BusinessOwnerId, BusinessStatus, SecurityClassification, '
            + ' ComplianceGroup, Description '
            + ' FROM FieldDefinition';

        if(String.isNotBlank(criteria)){
            q += criteria;
        }

        return database.query(q);

    }

}
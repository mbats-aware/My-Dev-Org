public with sharing class GetEntityDefinitions {
	
	//private static Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();

	public static void execute(){

		List<metadata__c> metas = new List<metadata__c>();

		List<EntityDefinition> entityDefinitions = Util.getEntities('WHERE IsCustomizable = TRUE');
		
		/*[SELECT Id, DurableId, LastModifiedDate, LastModifiedById, QualifiedApiName, NamespacePrefix, DeveloperName, MasterLabel, Label, 
			PluralLabel, DefaultCompactLayoutId, IsCustomizable, IsApexTriggerable, IsWorkflowEnabled, IsProcessEnabled, IsCompactLayoutable, DeploymentStatus, KeyPrefix, IsCustomSetting, 
			IsDeprecatedAndHidden, IsReplicateable, IsRetrieveable, IsSearchLayoutable, IsSearchable, IsTriggerable, IsIdEnabled, IsEverCreatable, IsEverUpdatable, IsEverDeletable, 
			IsFeedEnabled, IsQueryable, IsMruEnabled, DetailUrl, EditUrl, NewUrl, EditDefinitionUrl, HelpSettingPageName, HelpSettingPageUrl, RunningUserEntityAccessId, PublisherId, 
			IsLayoutable, RecordTypesSupported, InternalSharingModel, ExternalSharingModel, HasSubtypes, IsSubtype, IsAutoActivityCaptureEnabled, IsInterface, ImplementsInterfaces, 
			ImplementedBy, ExtendsInterfaces, ExtendedBy, DefaultImplementation 
			FROM EntityDefinition
			WHERE IsCustomizable = TRUE
			AND QualifiedApiName like '%__c'];*/

		for(EntityDefinition def : entityDefinitions){
			if(def.QualifiedApiName.endsWithIgnorecase('__c')){
				Metadata__c m = new Metadata__c();
				m.Name = def.QualifiedApiName;
				m.ApiName__c = def.QualifiedApiName;
				m.FullApiName__c = def.QualifiedApiName;
				m.NamespacePrefix__c = def.NamespacePrefix;
				m.MetadataType__c = 'EntityDefnintion';
				m.IsCustom__c = true;
				m.UniqueId__c = def.DurableId;

				if(def.IsCustomSetting){
					m.ObjectType__c = 'Custom Setting';
				}
				else if(def.QualifiedApiName.endsWithIgnoreCase('__mdt')){
					m.ObjectType__c = 'Custom Metadata Type';
				}
				else {
					m.ObjectType__c = 'sObject';
					m.IsCustom__c = def.QualifiedApiName.endsWithIgnoreCase('__c');
				}
				
				metas.add(m);
			}
		}

		database.upsert(metas, Schema.Metadata__c.UniqueId__c, true);
		database.executeBatch(new GetFieldDefinitions());
	}

}
public with sharing class GetFieldDefinitions implements Database.Batchable<sObject> {

	public System.Iterable<SObject> start(Database.BatchableContext BC){
		return Util.getFields('WHERE EntityDefinition.IsCustomizable = TRUE');
		
		/*[SELECT Id, DurableId, QualifiedApiName, EntityDefinitionId, EntityDefinition.QualifiedApiName, NamespacePrefix, DeveloperName, MasterLabel, Label,
			Length, DataType, IsCalculated, IsHighScaleNumber, IsHtmlFormatted, IsNameField, IsListFilterable, IsListSortable, IsApiGroupable, IsListVisible,
			ControllingFieldDefinitionId, LastModifiedDate, LastModifiedById, PublisherId, RunningUserFieldAccessId, RelationshipName, ReferenceTo, ReferenceTargetField, 
			IsCompound, IsSearchPrefilterable, IsPolymorphicForeignKey, IsAiPredictionField, BusinessOwnerId, BusinessStatus, SecurityClassification, 
			ComplianceGroup, Description
			FROM FieldDefinition
			WHERE EntityDefinition.IsCustomizable = TRUE
			AND EntityDefinition.QualifiedApiName like '%__c'];*/
	}

	public void execute(Database.BatchableContext BC, List<FieldDefinition> scope){
		List<metadata__c> metas = new List<metadata__c>();

		for(FieldDefinition def : scope){
			if(def.EntityDefinition.QualifiedApiName.endsWithIgnoreCase('__c')){
				Metadata__c m = new Metadata__c();
				m.Name = def.DeveloperName;
				m.ApiName__c = def.QualifiedApiName;
				m.FullApiName__c = def.EntityDefinition.QualifiedApiName + '.' + def.QualifiedApiName;
				m.NamespacePrefix__c = def.NamespacePrefix;
				m.MetadataType__c = 'FieldDefinition';
				m.IsCustom__c = def.QualifiedApiName.endsWithIgnoreCase('__c');
				m.UniqueId__c = def.DurableId;
				m.ParentMetadata__r = new Metadata__c(UniqueId__c = def.EntityDefinitionId);
				m.DataType__c = def.DataType.subStringBefore('(').trim();
				m.Length__c = def.Length != 0 ? def.Length : null;
				
				metas.add(m);
			}
		}

		database.upsert(metas, Schema.Metadata__c.UniqueId__c, true);
	}

	public void finish(Database.BatchableContext BC){

	}
}
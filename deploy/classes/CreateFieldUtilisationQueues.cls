public with sharing class CreateFieldUtilisationQueues implements Database.Batchable<EntityDefinition>, Database.Stateful {

	public Id jobId;

	public System.Iterable<EntityDefinition> start(Database.BatchableContext BC){
		MetadataAnalysisJob__c job = new MetadataAnalysisJob__c();
		job.AnalysisType__c = 'Adoption & Utilisation';
		job.Status__c = 'Pending';
		this.jobId = database.insert(job).getId();

		//QualifiedApiName LIKE '%__c'

		return [SELECT Id, QualifiedApiName, DurableId,
				(SELECT Id, QualifiedApiName, DurableId
					FROM Particles 
					WHERE IsUpdatable = TRUE)
			FROM EntityDefinition
			WHERE IsQueryable = TRUE 
			AND IsCustomizable = TRUE];
	}
	
	public void execute(Database.BatchableContext BC, List<EntityDefinition> scope){

		List<FieldUtilisationQueue__c> fuqs = new List<FieldUtilisationQueue__c>();
		
		for(EntityDefinition ent : scope){
			if(!ent.Particles.isEmpty()){

				boolean isValid = FALSE;
				system.debug(ent.Fields);

				string q = 'SELECT ';

				for(EntityParticle f : ent.Particles){
					//if(f.QualifiedApiName.endsWithIgnoreCase('__c')){
						isValid = TRUE;
						q+= f.QualifiedApiName + ', ';
					//}
				}

				q = q.left(q.length() - 2);

				q+= ' FROM ' + ent.QualifiedApiName;

				FieldUtilisationQueue__c fuq = new FieldUtilisationQueue__c();
				fuq.MetadataAnalysisJob__c = jobId; //'a025g000009A1WBAA0';
				fuq.ObjectName__c = ent.QualifiedApiName;
				fuq.ObjectId__c = ent.DurableId;
				fuq.SOQLQuery__c = q;
				fuq.Status__c = 'Pending';

				//if(isValid){
					fuqs.add(fuq);
				//}
			}
		}

		database.insert(fuqs);
		
	}

	public void finish(Database.BatchableContext BC){
		database.executeBatch(new GetFieldUtilisation());
	}
}
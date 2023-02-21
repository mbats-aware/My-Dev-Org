public with sharing class GetFieldUtilisation implements Database.Batchable<sObject>  {

    public FieldUtilisationQueue__c fuq;
    public integer totalRows;
    public map<string, integer> fieldCountMap;

    public GetFieldUtilisation(){
        fuq = [SELECT Id, SOQLQuery__c, Status__c, ObjectName__c, ObjectId__c
            FROM FieldUtilisationQueue__c
            WHERE Status__c = 'Pending'
            LIMIT 1];

        totalRows = database.countQuery('select count() from ' + fuq.ObjectName__c);
    }

    public GetFieldUtilisation(string sObjectApiName){
        fuq = [SELECT Id, SOQLQuery__c, Status__c, ObjectName__c, ObjectId__c
            FROM FieldUtilisationQueue__c
            WHERE ObjectName__c = :sObjectApiName
            LIMIT 1];

        totalRows = database.countQuery('select count() from ' + fuq.ObjectName__c);
    }

    public System.Iterable<sObject> start(Database.BatchableContext BC){

        Metadata__c ent = new Metadata__c();
        ent.Name = fuq.ObjectName__c.replace('__c', '');
        ent.FullApiName__c = fuq.ObjectName__c;
        ent.TotalRows__c = totalRows;
        ent.MetadataType__c = 'EntityDefinition';
        ent.APIName__c = fuq.ObjectName__c;
        ent.UniqueId__c = fuq.ObjectId__c;
        database.upsert(ent, Schema.Metadata__c.UniqueId__c, true);

        fuq.Status__c = 'In progress';
        database.update(fuq);

        return database.query(fuq.SOQLQuery__c);
    }

    public void execute(Database.BatchableContext BC, List<sObject> scope){

        fieldCountMap = new map<string, integer>();

        string fieldString = fuq.SOQLQuery__c.subStringBefore(' FROM');
        fieldString = fieldString.removeStartIgnorecase('SELECT ');

        List<string> fieldList = fieldString.split(', ');

        for(sObject obj : scope){
            for(String fieldName : fieldList){
                string fullApiName = fuq.ObjectName__c + '.' + fieldName;

                if(!fieldCountMap.containsKey(fullApiName)){
                    fieldCountMap.put(fullApiName, 0);
                }

                if(obj.get(fieldName) != null){
                    integer runningCount = fieldCountMap.get(fullApiName) + 1;
                    fieldCountMap.put(fullApiName, runningCount);
                }
            }
        }

        List<Metadata__c> updates = new List<Metadata__c>();

        for(String fullApiName : fieldCountMap.keySet()){
            double populatedRows = fieldCountMap.get(fullApiName);

            Metadata__c m = new Metadata__c();
            m.Name = fullApiName.removeEndIgnoreCase('__c');
            m.FullApiName__c = fullApiName;
            m.ApiName__c = fullApiName.removeStartIgnoreCase(fuq.ObjectName__c + '.');
            m.MetadataType__c = 'FieldDefinition';
            m.PopulatedRows__c = populatedRows;
            m.FieldUtilisation__c = (populatedRows / totalRows) * 100;
            updates.add(m);
        }

        database.upsert(updates, Schema.Metadata__c.FullApiName__c, true);
    }

    public void finish(Database.BatchableContext BC){	

        fuq.Status__c = 'Completed';
        database.update(fuq);

        if([select count() from FieldUtilisationQueue__c WHERE Status__c = 'Pending'] > 0){
            database.executeBatch(new GetFieldUtilisation());
        }
    }

}
database.delete([select Id from Metadata__c]);
database.emptyRecycleBin([select Id from Metadata__c where IsDeleted = true LIMIT 10000 ALL ROWS ]);

GetEntityDefinitions.execute();

CreateFieldUtilisationQueues.execute();
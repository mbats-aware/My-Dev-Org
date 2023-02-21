public with sharing class ResourceEstimatorController {

    public ResourceEstimatorController() {

    }

    @AuraEnabled(cacheable=true)
    public static Opportunity getOpp(string oppId){
        try{
            return [SELECT Id, Name, AccountId, Account.Name, Rate_Card__c, Rate_Card__r.Name
                FROM Opportunity
                WHERE Id = :oppId
                LIMIT 1];
        } 
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Resource_Rate__c> getRates(string rateCardId){
        try{
            return [SELECT Id, Name, Rate__c, ResourceRate__c, Daily_Cost_Rate__c, Career_Level__c, Capability__c, Position__c, ClientRoleName__c, Client_Position__c, Margin__c, Profit__c
                FROM Resource_Rate__c
                WHERE Rate_Card__c = :rateCardId
                ORDER BY Capability__c ASC, Career_Level__c ASC];
        } 
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static Resource_Plan__c loadPlan(string planId){
        try{
            return [SELECT Id, Iterations__c, Variance__c, Key__c, Account__c, Account__r.Name, Rate_Card__c
                FROM Resource_Plan__c 
                WHERE Id = :planId 
                LIMIT 1];
        } 
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Resource_Plan_Role__c> loadRoles(string planId){
        try{
            return [SELECT Id, Name, Resource_Rate__c, Resource_Rate__r.Name, Plan_Rate__c, Key__c, Utilisation_Array__c, Resource_Rate__r.Daily_Cost_Rate__c,
                    (SELECT Id, Utilisation__c 
                        FROM Resource_Plan_Role_Weeks__r 
                        ORDER BY Week_Number__c ASC)
                FROM Resource_Plan_Role__c 
                WHERE Resource_Plan__c = :planId
                ORDER BY Display_Order__c ASC];
        } 
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void savePlan(Resource_Plan__c plan){
        database.UpsertResult ur = database.upsert(plan, Resource_Plan__c.Fields.Key__c, true);
        if(!ur.isSuccess()){
            throw new AuraHandledException(ur.getErrors()[0].getMessage());
        }
    }

    @AuraEnabled
    public static void saveRoles(List<Resource_Plan_Role__c> roles){
        List<Database.UpsertResult> urList = database.upsert(roles, Resource_Plan_Role__c.Key__c, true);
        for(Database.UpsertResult ur : urList){
            if(!ur.isSuccess()){
                throw new AuraHandledException(ur.getErrors()[0].getMessage());
            }
        }
    }

    @AuraEnabled
    public static void deleteRole(string key){
        Resource_Plan_Role__c rpr = [SELECT Id FROM Resource_Plan_Role__c WHERE Key__c = :key LIMIT 1];
        Database.DeleteResult dr = database.delete(rpr);
        if(!dr.isSuccess()){
            throw new AuraHandledException(dr.getErrors()[0].getMessage());
        }
    }

    @AuraEnabled(cacheable=true scope='global')
    public static List<LookupSearchResult> searchAccounts(String searchTerm) {
        try{
            // Prepare query parameters
            searchTerm = '%' + searchTerm + '%';
            String accountIcon = 'standard:account';

            List<Account> accs = [select Id, Name from Account where Name like :searchTerm];

            // Prepare results
            List<LookupSearchResult> results = new List<LookupSearchResult>();

            // Extract Accounts & convert them into LookupSearchResult
            for (Account account : accs) {
                results.add(new LookupSearchResult(account.Id, 'Account', accountIcon, account.Name, null));
            }

            results.sort();
            return results;
        }
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true scope='global')
    public static List<Rate_Card__c> getAvailableRateCards(String accountId) {
        try{
            return [select Id, Name from Rate_Card__c where Account__c = :accountId];
        }
        catch(Exception e){
            throw new AuraHandledException(e.getMessage());
        }
    }
}
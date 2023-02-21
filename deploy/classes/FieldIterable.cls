public with sharing class FieldIterable implements Iterable<String> {
	public Iterator<Account> iterator(){
	   List<Account> accs =
	   [SELECT Id, Name,
		NumberOfEmployees 
		FROM Account
		LIMIT 10];
	   return new CustomIterator(accs);
	}
 }

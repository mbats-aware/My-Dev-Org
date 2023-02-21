import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';
import sheetjs  from '@salesforce/resourceUrl/sheetjs';
import getOpp from '@salesforce/apex/ResourceEstimatorController.getOpp';
import getRates from '@salesforce/apex/ResourceEstimatorController.getRates';
import loadPlan from '@salesforce/apex/ResourceEstimatorController.loadPlan';
import loadRoles from '@salesforce/apex/ResourceEstimatorController.loadRoles';
import savePlan from '@salesforce/apex/ResourceEstimatorController.savePlan';
import saveRoles from '@salesforce/apex/ResourceEstimatorController.saveRoles';
import deleteRole from '@salesforce/apex/ResourceEstimatorController.deleteRole';
import searchAccounts from '@salesforce/apex/ResourceEstimatorController.searchAccounts';
import getAvailableRateCards from '@salesforce/apex/ResourceEstimatorController.getAvailableRateCards';

export default class ResourceEstimator extends NavigationMixin(LightningElement) {

    // To Do: 
    // write to and from Opportunity Assignments???
    // Reset rates (individual and all at once)
    // Save plan
    // export to CSV/Image
    // set plan options (planning sprint, weeks per sprint, sprints per iteration)
    // select rate card & load automatically from Engagement/Oppty
    // templated plans

    // Done:
    // load plan from saved data
    // Delete Row/s
    // Delete Iteration/s
    // sorting

    @api recordId;
    @track isLoading = true;
    @track isSaving = false;

    @track showConfigModal = false;
    @track summarySectionIcon = 'utility:chevrondown';
    currentPageReference;

    @track weeks;
    @track rateCardOptions;

    plan = {
        'rateCardId': null,
        'accountId': null,
        'accountDisabled': false,
        'rateCardDisabled': false,
        'variance': 20,
        'iterations': 1,
        'weeks': 12,
        'sprintsPerIteration': 6,
        'weeksPerSprint': 2,
        'planningSprints': 0,
        'targetMargin': 0.3,
        'marginCompliant': true
    }

    @track additionalCosts = [];

    get weekColStyle(){
        if(this.plan.weeks > 12){
            return 'min-width: 53px;'
        }
        return 'min-width: ' + (100 / this.plan.weeks) + '%;';
    }

    get additionalCostTotal(){
        if(this.additionalCosts.length > 0){
            var sum = 0;

            this.additionalCosts.forEach((cost) => {
                sum += cost.amount;
            })

            return sum;
        }
        return 0;
    }

    @api headers = [];

    @track roles;

    @api planId;
    @api rateCardId;
    @track rates;
    @track resources;
    @track data;
    @track deletedKeys = [];

    init = false;

    @track opp;
    @track account;
    @track rateCard;

    xlsxInit = false;

    @track workbook;

    // get rates
    // get roles

    async connectedCallback() {
        await loadScript(this, sheetjs ); // load the library
        // At this point, the library is accessible with the `XLSX` variable
        console.log(XLSX.version);
        var wb = XLSX.utils.book_new();
      }

    // get page state
    @wire(CurrentPageReference)
    setCurrentPageReference(currentPageReference) {
        this.currentPageReference = currentPageReference;
        this.recordId = currentPageReference.state?.c__oppId;

        if(this.recordId == null){
            this.createHeaders();
            this.addRow();
        }
    }

    // get opp
    @wire(getOpp, {'oppId': '$recordId'})
    wiredOpp({error, data}){
        if(data){
            this.opp = {
                id: data.Id,
                sObjectType: 'Opportunity',
                icon: 'standard:opportunity',
                title: data.Name,
                subtitle: data.Account.Name
            }

            this.account = {
                id: data.AccountId,
                sObjectType: 'Account',
                icon: 'standard:account',
                title: data.Account.Name,
                subtitle: null
            }

            this.rateCard = {
                id: data.Rate_Card__c,
                sObjectType: 'Rate_Card__c',
                icon: 'standard:resource_capacity',
                title: data.Rate_Card__r.Name,
                subtitle: null
            }

            /* TO DO: Get values from Oppty */
            this.plan.iterations = 1;
            this.plan.weeks = 12;
            this.plan.variance = 15;
            this.plan.key = data.Id;
            this.createHeaders();
            this.roles = [];
            this.addRow();
        }
        else if(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    @wire(getRates, {rateCardId: '$rateCard.id'})
    wiredRates({error, data}){
        if(data){

            var rates = JSON.parse(JSON.stringify(data)),
                resources = [];

            rates.sort((a, b) => {
                if (a.Capability__c.toLowerCase() === b.Capability__c.toLowerCase()){
                    return a.Career_Level__c.toLowerCase() < b.Career_Level__c.toLowerCase() ? -1 : 1
                } 
                else {
                    return a.Capability__c.toLowerCase() < b.Capability__c.toLowerCase() ? -1 : 1
                }
            });

            rates.forEach((rate) => {
                resources.push({'label': rate.Name, 'value': rate.Id, 'icon-name': null});
            });

            this.rates = rates;
            this.resources = resources;
        }
        else if(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    renderedCallback(){
        if(this.xlsxInit){
            this.workbook = XLSX;
            console.log(this.workbook);
        }

        this.updateHighlighting();
        this.checkCompliance();

        setTimeout(() => {
            this.isLoading = false;
        }, 3000);
    }

    fillFromFirst(e){
        try{
            var key = e.target.dataset.row,
                role = this.getRole(key);

            var role = this.getRole(key),
                val = role.days[0];

            for(var i = 0; i < role.days.length; i++){
                role.days[i] = val;
            }

            role = this.recalc(role);

            this.updateHighlighting();
            this.checkCompliance();
        } 
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    moveItemUp(key){
        let ind = this.roles.map(item => item.key).indexOf(key);
        this.array_move(this.roles, ind, ind-1);
    }

    moveItemDown(key){
        let ind = this.roles.map(item => item.key).indexOf(key);
        this.array_move(this.roles, ind, ind+1);
    }

    array_move(arr, old_index, new_index) {
        if (new_index >= arr.length) {
            var k = new_index - arr.length + 1;
            while (k--) {
                arr.push(undefined);
            }
        }
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
        this.roles = arr; // for testing

        this.getRoleActions();
    };

    checkCompliance(){
        var fixedTarget = parseFloat(this.plan.targetMargin.toFixed(3), 3);
        var fixedMargin = parseFloat(this.totalMargin.toFixed(3), 3);

        this.plan.marginCompliant = (fixedTarget <= fixedMargin);
    }

    getRoleActions(){
        this.roles.forEach((role, i) => {
            role.actions = [];

            if(this.roles.length> 1){
                if(i == this.roles.length - 1){
                    role.actions.push({label: 'Move Up', value: 'moveUp'});
                }
                else  if(i == 0){
                    role.actions.push({label: 'Move Down', value: 'moveDown'});
                }
                else {
                    role.actions.push({label: 'Move Up', value: 'moveUp'});
                    role.actions.push({label: 'Move Down', value: 'moveDown'});
                }
            }

            //role.actions.push({label: 'Fill From First', value: 'fill'});
    
            role.actions.push({label: 'Reset Charge Rate', value: 'reset'});
            role.actions.push({label: 'Delete', value: 'delete'});
        })
    }

    handleRowAction(e){

        var key = e.target.dataset.row;

        switch(e.detail.value){
            case 'moveUp':
                this.moveItemUp(key);
                break;

             case 'moveDown':
                this.moveItemDown(key);
                break;

            case 'reset':
                console.log('RESET!');
                break;

            case 'delete':
                this.deleteRow(key);
                break;

            default:
                break;
        }
    }

    handleAccountSearch(e){
        const lookupElement = e.target;

        searchAccounts({'searchTerm': e.detail.searchTerm})
        .then(results => {
            lookupElement.setSearchResults(results);
        })
        .catch(error => {
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        });
    }

    handleSelectionChange(e){
        this.rateCardOptions = undefined;
        const ids = e.detail;

        if(ids.length > 0){
            this.plan.accountId = ids[0];
            this.setRateCardOptions(ids[0]);
        };
    }

    setRateCardOptions(accId){

        getAvailableRateCards({accountId: accId})
        .then((result) => {
            let options = [];

            result.forEach((r) => {
                options.push(
                    {'label': r.Name, 'value': r.Id}
                );
            });

            this.rateCardOptions = options;
            if(this.rateCardOptions.length == 1 && this.plan.rateCardId == null){
                this.plan.rateCardId = options[0].value;
            }
        });
    }

    handleRateCardSelection(e){
        this.rateCardId = e.target.value;
    }

    get resourceTotalAmount(){
        var total = 0;

        if(this.roles){
            this.roles.forEach((role) => {
                total += role.totalAmount;
            });
        }

        return total;
    }

    get resourceTotalCost(){
        var total = 0;

        if(this.roles){
            this.roles.forEach((role) => {
                //if(role.totalDays > 0){
                    total += role.totalCost;
                //}
            });
        }

        return total;
    }

    get maxTotal(){
        return (this.resourceTotalAmount + (this.resourceTotalAmount * (this.plan.variance/100))) + this.additionalCostTotal;
    }

    get minTotal(){
        return (this.resourceTotalAmount - (this.resourceTotalAmount * (this.plan.variance/100))) + this.additionalCostTotal;
    }
    
    get totalMargin(){
        var margin = (this.resourceTotalAmount - this.resourceTotalCost) / this.resourceTotalAmount;
        return margin || 0;
    }

    createHeaders(){
        this.weeks = [];

        //for(var i=1; i <= (this.plan.iterations * 12); i++){
        for(var i=1; i <= this.plan.weeks; i++){
            this.weeks.push('W' + i);
        }
    }

    toggleSummary(){
        var section = this.template.querySelector('section.summary-section');
        section.classList.toggle('slds-is-open');
        
        if(this.summarySectionIcon == 'utility:chevronright'){
            this.summarySectionIcon = 'utility:chevrondown';
        }
        else {
            this.summarySectionIcon = 'utility:chevronright';
        }
    }

    updateIterations(){

        try{
            var roles = this.roles;
            
            roles.forEach((role) => {
                
                if((this.plan.iterations * 12) > role.days.length){
                    let addWeeks = (this.plan.iterations * 12) - role.days.length;

                    for(var i = 0; i < addWeeks; i++){
                        role.days.push(null);
                    }

                }
                else if((this.plan.iterations * 12) < role.days.length){
                    let subWeeks = role.days.length - (this.plan.iterations * 12);
                    let startIndex = this.plan.iterations * 12;
                    role.days.splice(startIndex, subWeeks)
                }

            });

            this.roles = roles;
            this.createHeaders();

            this.roles.forEach(role => {
                role = this.recalc(role);
            })
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    updateWeeks(){

        try{
            var roles = this.roles;
            
            roles.forEach((role) => {
                
                if(this.plan.weeks > role.days.length){
                    let addWeeks = this.plan.weeks - role.days.length;

                    for(var i = 0; i < addWeeks; i++){
                        role.days.push(null);
                    }

                }
                else if(this.plan.weeks < role.days.length){
                    let subWeeks = role.days.length - this.plan.weeks;
                    let startIndex = this.plan.weeks;
                    role.days.splice(startIndex, subWeeks)
                }

            });

            this.roles = roles;
            this.createHeaders();

            this.roles.forEach(role => {
                role = this.recalc(role);
            })
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    recalc(role){
        role.totalDays = role.days.reduce((a,b) => {return (a || 0) + (b || 0)}) || 0;
        role.totalAmount = (role.totalDays * role.chargeRate) || 0;
        role.totalCost = (role.totalDays * role.costRate) || 0;
        this.checkCompliance();
        return role;
    }

    addRow(){
        var uuid = this.uuidv4();

        var row = {
            'key': uuid,
            'role': null,
            'resource': null,
            'resourceLabel': null,
            'rate': 0,
            'totalDays': 0,
            'totalAmount': 0,
            'status': 0,
            'days': [],
            'actions': []
        }

        //for(var i = 1; i <= (this.plan.iterations * 12); i++){
        for(var i = 1; i <= this.plan.weeks; i++){
            row.days.push(null);
        }

        this.roles.push(row);
        this.getRoleActions();
        
    }

    getTotalDays(data){
        return data.days.reduce((a,b) => {return (a || 0) + (b || 0)}) || 0;
    };

    getTotalAmount(data){
        return data.totalDays * data.chargeRate || 0;
    };

    getTotalCost(data){
        return data.totalDays * data.costRate || 0;
    }

    getRole(key){
        try{
            return this.roles.find(role => role.key === key);
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    handleRoleChange(e){
        try {
            var key = e.target.dataset.row,
                role = this.getRole(key),
                selectedValue = e.target.value;

            role.role = selectedValue;
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    handleUtilisationChange(e){
        try{
            var key = e.target.dataset.row,
                role = this.getRole(key),
                w = e.target.dataset.week;

            role.days[w] = parseFloat(e.target.value);
            role = this.recalc(role);

            if(e.target.value){
                e.target.classList.add('input_has-value');
            }
            else {
                e.target.classList.remove('input_has-value');
            }

            this.checkCompliance();
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    updateHighlighting(){
        try{
            var inputs = this.template.querySelectorAll('.utilisation input.slds-input');

            inputs.forEach(i => {
                if(i.value){
                    i.classList.add('input_has-value');
                }
                else {
                    i.classList.remove('input_has-value');
                }
            });
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    navigateToRecord(e){
        e.stopPropagation();

        let obj = e.target.dataset.sobject,
            id = e.target.dataset.recordId;

        this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: {
                recordId: id,
                actionName: 'view',
            },
        })
        .then((url) => {
            window.open(url, "_blank");
        })
    }

    handleResourceSelection(e){
        try{
            var key = e.target.dataset.row,
                role = this.getRole(key),
                selectedValue = e.target.value,
                resourceRate = this.rates.find(rate => rate.Id === selectedValue),
                previousRate = this.rates.find(rate => rate.Id === role.resource);

            if(previousRate){
                console.log(previousRate.ClientRoleName__c + ':' + resourceRate.ClientRoleName__c);
            }

            role.resource = selectedValue;
            if(role.role == null || role.role == '' || (previousRate && role.role == previousRate.ClientRoleName__c)){
                role.role = resourceRate.ClientRoleName__c;
            }
            role.resourceLabel = resourceRate.Name;
            role.chargeRate = resourceRate.Rate__c;
            role.costRate = resourceRate.Daily_Cost_Rate__c
            role.totalAmount = this.getTotalAmount(role);
            role.totalCost = this.getTotalCost(role);

            this.checkCompliance();
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    handleRateChange(e){
        try{
            var rateId = e.target.dataset.rateId,
                updatedVal = e.target.value,
                rate = this.rates.find(rate => rate.Id === rateId);

            rate.Rate__c = updatedVal;
            rate.Profit__c = updatedVal - rate.Daily_Cost_Rate__c;
            rate.Margin__c = ((updatedVal - rate.Daily_Cost_Rate__c) / updatedVal) * 100;

            if(this.roles){
                this.roles.forEach((role) =>{
                    if(role.resource == rateId){
                        role.chargeRate = updatedVal;
                        role.totalAmount = this.getTotalAmount(role);
                        role.totalCost = this.getTotalCost(role);
                    }
                });
            };

            this.checkCompliance();
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }
    }

    save(){
        this.isSaving = true;
        var plan = {'sobjectType': 'Resource_Plan__c'};

        plan['Key__c'] = this.plan.key;
        plan['Name'] = 'Test Plan 1';
        plan['Engagement__c'] = 'a2s5g000000PNCpAAO';
        plan['Rate_Card__c'] = this.rateCardId;
        plan['Variance__c'] = this.plan.variance;
        plan['Weeks_Per_Sprint__c'] = this.plan.weeksPerSprint;
        plan['Iterations__c'] = this.plan.iterations;
        plan['Sprints_per_Iteration__c'] = this.plan.sprintsPerIteration;
        plan['Planning_Sprints__c'] = this.plan.planningSprints;

        savePlan({plan: plan})
        .then((result) => {
            
            var roles = this.roles;
            var records = [];

            this.roles = roles;

            // create role records
            roles.forEach((role, i) =>{

                if(role.resource){
                    var obj = {
                        'sobjectType': 'Resource_Plan_Role__c',
                        'Name': role.role,
                        'Key__c': role.key,
                        'Resource_Plan__r': {
                            'sobjectType': 'Resource_Plan__c',
                            'Key__c': this.plan.key
                        },
                        'Resource_Rate__c': role.resource,
                        'Plan_Rate__c': role.chargeRate,
                        'Display_Order__c': i,
                        'Utilisation_Array__c': JSON.stringify(role.days) 
                    };

                    records.push(obj);
                }

            });

            return saveRoles({'roles': records});

        })
        .then(() => {
            this.showToast('Success', 'Resource Plan Saved', 'success', 'pester');
        })
        .catch((error) => {
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        })
        .finally(() => {
            this.isSaving = false;
        })
    }

    toggleConfigModal(){
        this.showConfigModal = !this.showConfigModal;
    }

    saveConfig(){
        try {
            var variance = this.template.querySelector('.variance').value,
            weeks = this.template.querySelector('.number-of-weeks').value;
            //iterations = this.template.querySelector('.iterations').value;

            if(this.plan.variance != variance){
                this.plan.variance = variance;
            }
            //if(this.plan.iterations != iterations){
                //this.plan.iterations = iterations;
                //this.updateIterations();
            //}

            if(this.plan.weeks != weeks){
                this.plan.weeks = weeks;
                this.updateWeeks();
            }

            this.toggleConfigModal();
        }
        catch(error){
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }

    }

    deleteRow(key){
        var i = this.roles.map(function(e) { return e.key; }).indexOf(key);

        this.roles.splice(i, 1);
        
        deleteRole({'key': key})
        .then(() => {
            this.getRoleActions();
        })
        .catch(error => {
            console.log(error);
            this.showToast('Error', error.message, 'error', 'pester');
        }); 
    }

    showToast(title, message, variant, mode){
        const event = new ShowToastEvent({
            'title': title,
            'message': message,
            'variant': variant,
            'mode': mode || 'pester'
        });
        this.dispatchEvent(event);
    }

    uuidv4() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
          (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    async exportToExcel(){
        try{
            var rows = [],
                header = ['Role', 'Resource', 'Rate', ...this.weeks, 'Days', 'Amount'];

            //header.splice(3, 0, ...this.weeks);
            rows.push(header);
            
            this.roles.forEach((role) => {
                var resource = this.rates.find(rate => rate.Id === role.resource);
                var row = [
                    role?.role, resource?.Name || null, role?.chargeRate || null, ...role.days, role?.totalDays, role?.totalAmount 
                ];
                rows.push(row);
            });

            let summary = [];
            summary.push(['Total Amount', this.resourceTotalAmount]);
            summary.push(['Variance %', this.plan.variance]);
            summary.push(['Minimum Amount', this.minTotal]);
            summary.push(['Maximum Amount', this.maxTotal]);

            //let csvContent = rows.map(e => e.join(',')).join('\n');
            console.log(summary);

            await loadScript(this, sheetjs); 
            let summarySheet = XLSX.utils.aoa_to_sheet(summary);

            var wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

            XLSX.writeFile(wb, "poc.xlsx", { compression: true });
        }
        catch(e){
            console.log(e);
        }
    }
}
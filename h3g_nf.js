// global namespace
var NF = NF || {
	
	thresholds: {
		
		// ACT thresholds
		ACT: {
			green: 0,
			amber: 1800,
			red: 2100
		},
		
		// ASA thresholds
		ASA: {
			green: 0,
			amber: 90,
			red: 99
		},
		
		// SL thresholds
		SL: {
			green: 90,
			amber: 85,
			red: 0
		},
		
		// Concurrency thresholds
		Concurrency: {
			green: 1.60,
			amber: 1.52,
			red: 0.00
		},
		
		// Answered thresholds
		Answered: {
			green: 97,
			amber: 92,
			red: 0
		},
		
		// Unanswered thresholds
		Unanswered: {
			green: 0,
			amber: 5,
			red: 10
		}
	}
		
};

// ACT
NF.printACT = function(value) {
	
	if (value > this.thresholds.ACT.red) {
		return '<td class="nf-red">' + toHHMMSS(value) + '</td>';
	}
	
	else if ( value >= this.thresholds.ACT.amber && value <= this.thresholds.ACT.red ) {
		return '<td class="nf-amber">' + toHHMMSS(value) + '</td>';
	}
	
	else 
		return '<td class="nf-green">' + toHHMMSS(value) + '</td>';

};


// ASA
NF.printASA = function(value) {
	
	if (value > this.thresholds.ASA.red) {
		return '<td class="nf-red">' + toHHMMSS(value) + '</td>';
	}
	
	else if ( value >= this.thresholds.ASA.amber && value <= this.thresholds.ASA.red ) {
		return '<td class="nf-amber">' + toHHMMSS(value) + '</td>';
	}
	
	else 
		return '<td class="nf-green">' + toHHMMSS(value) + '</td>';
};

// SL
NF.printSL = function(value) {
	
	if (value > this.thresholds.SL.green) {
		return '<span class="nf-green">' + value + '</span>';
	}
	
	else if ( value <= this.thresholds.SL.green && value >= this.thresholds.SL.amber ) {
		return '<span class="nf-amber">' + value + '</span>';
	}
	
	else if ( value < this.thresholds.SL.amber && value > this.thresholds.SL.red ) {
		return '<span class="nf-red">' + value + '</span>';
	}
	
	else {
		return '<span>' + value + '</span>';
	}
};


// Concurrency
NF.printConcurrency = function(value) {
	
	if (value > this.thresholds.Concurrency.green) {
		return '<span class="nf-green">' + value + '</span>';
	}
	
	else if ( value <= this.thresholds.Concurrency.green && value >= this.thresholds.Concurrency.amber ) {
		return '<span class="nf-amber">' + value + '</span>';
	}
	
	else if ( value < this.thresholds.Concurrency.amber && value > this.thresholds.Concurrency.red ) {
		return '<span class="nf-red">' + value + '</span>';
	}
	
	else {
		return '<span>' + value + '</span>';
	}
	
};


// Answered
NF.printAnswered = function(value) {
	
	if (value > this.thresholds.Answered.green) {
		return '<span class="nf-green">' + value + '</span>';
	}
	
	else if ( value <= this.thresholds.Answered.green && value >= this.thresholds.Answered.amber ) {
		return '<span class="nf-amber">' + value + '</span>';
	}
	
	else if ( value < this.thresholds.Answered.amber && value > this.thresholds.Answered.red ) {
		return '<span class="nf-red">' + value + '</span>';
	}
	
	else {
		return '<span>' + value + '</span>';
	}
	
};


// Unanswered
NF.printUnanswered = function(value) {
	
	if (value > this.thresholds.Unanswered.red) {
		return '<span class="nf-red">' + value + '</span>';
	}	
	else if ( value >= this.thresholds.Unanswered.amber && value <= this.thresholds.Unanswered.red ) {
		return '<span class="nf-amber">' + value + '</span>';
	}	
	else if ( value >= this.thresholds.Unanswered.green && value < this.thresholds.Unanswered.amber ) {
		return '<span class="nf-green">' + value + '</span>';
	}
	else {
		return '<span>' + value + '</span>';
	}
};


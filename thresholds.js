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
			amber: 60,
			red: 90
		},
		
		// SL thresholds
		SL: {
			green: 75,
			amber: 70,
			red: 0
		},
		
		// Concurrency thresholds
		concurrency: {
			green: 1.60,
			amber: 1.52,
			red: 0.00
		},
		
		// Answered thresholds
		answered: {
			green: 97,
			amber: 92,
			red: 0
		},
		
		// Unanswered thresholds
		unanswered: {
			green: 0,
			amber: 5,
			red: 10
		}
	}
};


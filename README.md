# h3gdashboard
This should be run on Heroku

Files:

Server.js       - main node.js file
dashboard.html  - top level view
dashboard.js    - js for top level view
skillgroup.html  - skillgroup view
skillgroup.js   - js for skillgroup view
department.html  - department view
department.js   - js for department view
monitor.html    - monitor view
monitor.js      - js for monitor view
csat.html       - csat view (no longer used since Oct 2020)
csat.js         - js for csat view
h3g_utils.js    - js which includes all common functions used in views above including signing in
thresholds.js   - contains js functions to colour code the metrics depending on value

Note:
Only department names with square brackets at the start will be considered e.g. [myskill] mydept.
The name in square brackets is the skillgroup e.g. "myskill" and the remaining name is the dept name e.g. "mydept"

// Global tracking to prevent memory leaks and graph overlapping
let trajectory_chart = null;

// NEW: Custom Canvas Plugin to paint phase transition dividers
const phase_dividers_plugin = {
    id: 'phaseDividers',
    
    afterDraw(chart) {
        const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
        const phase_milestones = [4, 8]; // Week indices where transitions happen
        
        ctx.save(); // Freeze current canvas state

        // -------------------------------------------------------------
        // STAGE A: DRAW THE SOLID VERTICAL SEPARATOR LINES
        // -------------------------------------------------------------
        phase_milestones.forEach(week_index => {
            const x_pixel = x.getPixelForValue(week_index);
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'; // Soft gray line
            ctx.lineWidth = 2;
            ctx.moveTo(x_pixel, top);
            ctx.lineTo(x_pixel, bottom);
            ctx.stroke();
        });

        // -------------------------------------------------------------
        // STAGE B: CALCULATE AND PAINT THE TEXT HEADERS
        // -------------------------------------------------------------
        // Configure text style rules
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Slate gray text color
        ctx.font = 'bold 12px Arial, sans-serif'; // Bold professional layout typography
        ctx.textAlign = 'center'; // Center horizontally over our coordinates
        
        // Find the visual pixel boundaries for Week 0, Week 4, Week 8, and Week 12
        const x_week0  = x.getPixelForValue(0);
        const x_week4  = x.getPixelForValue(4);
        const x_week8  = x.getPixelForValue(8);
        const x_week12 = x.getPixelForValue(12);
        
        // Compute horizontal midpoints for each lane column
        const mid_phase1 = x_week0 + (x_week4 - x_week0) / 2;
        const mid_phase2 = x_week4 + (x_week8 - x_week4) / 2;
        const mid_phase3 = x_week8 + (x_week12 - x_week8) / 2;
        
        // Set vertical baseline rise distance (places text 15 pixels above the top grid border line)
        const text_y_position = top - 15;
        
        // Stamp the strings onto the page canvas viewport layout
        ctx.fillText('Phase 1', mid_phase1, text_y_position);
        ctx.fillText('Phase 2', mid_phase2, text_y_position);
        ctx.fillText('Phase 3', mid_phase3, text_y_position);

        ctx.restore(); // Clean up context cache memory allocation
    }
};

function checkInputs() {
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: Receives weight, body fat percentage, activity level, and goal input from user
//      - verifies input of user into the console
//      - sends input values to simulation function
// ----------------------------------------------------------------------------------------------------------
// gather inputs and initialize variables
    let weight = parseFloat(document.getElementById('weightInput').value);
    let body_fat_percent = parseFloat(document.getElementById('bodyFatInput').value);
    let activity_input = parseFloat(document.getElementById('activityInput').value);
    let protein_input = (document.getElementById('proteinInput').value);
    let goal_choice = parseFloat(document.getElementById('goalInput').value);

// console verification
    console.log("---BIOMETRIC DATA ENTERED---");
    console.log(`User Weight: ${weight} kg`)
    console.log("Body fat of user: " + body_fat_percent + "%");
    console.log(`User activity constant: ${activity_input}`);
    console.log(`User protein intake: ${protein_input}`);
    console.log(`User goal caloric deficit/gain: ${goal_choice}`);
    console.log(" ");

// BATON PASS TO SIMULATION
    simulation_12_weeks(weight, body_fat_percent, activity_input, goal_choice, protein_input);
}

function simulation_12_weeks(weight, body_fat_percent, activity_input, goal_choice, protein_input){
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: 12 Week simulation that updates users total body mass, lean body mass, and body fat mass 
//                      throughout 12 weeks. Keeps track of user's caloric goals in 3 phases. 
//      - Calculates weight loss based on caloric deficit/surplus that user is in
//          o Calculates weight loss by calculating user's updating total daily energy expenditure based on 
//            dynamic lean body mass throughout 12 weeks.
// ----------------------------------------------------------------------------------------------------------
// CALCULATIONS FOR WEEK 0 INPUTS
    let calculated_lbm = calculate_lbm(weight, body_fat_percent);
    let calculated_bmr = calculate_bmr(calculated_lbm);
    let calculated_TDEE = calculate_tdee(calculated_bmr, activity_input);
    let calculated_target_calories = calculate_target_intake(calculated_TDEE, goal_choice);
    let calculated_protein_goal = calculate_protein(weight, protein_input);

// INITIALIZING SIMULATION VARIABLES
    let simulation = {
        // History buckets to graph output
        weight_history : [],
        lbm_history : [],
        fat_mass_history : [],
        calories_history : [], // tracks calorie changes across phases
        protein_history : [], // calculates protein goals across phases

        // Dynamic variables that will determine calculations
        current_weight : weight,
        current_lbm : calculated_lbm,
        current_fat : weight - calculated_lbm,
        current_TDEE : calculated_TDEE,
        current_target : calculated_target_calories,

        // variables to be passed
        activity_level : activity_input,
        protein_level : protein_input,
        current_protein : calculated_protein_goal,
        diet_choice : goal_choice,
        fat_ratio : 0.0,
        muscle_ratio : 0.0,
        mass_change: 0.0

    };

    update_histories(simulation);

//====================================================================//
// 12 Week For Loop Simulation: 
//  - Updates body mass, lbm, fat mass, and tdee throughout 12 weeks. 
//  - Keeps track of dynamic caloric targets
//  - Caloric Targets change on Week 5 and Week 9
//===================================================================//
for (let week = 1; week <= 12; week++){
    if (week === 1) {
    console.log(`--- WEEK 1 ROUTING DIAGNOSTIC ---`);
    console.log(`Captured Protein String: "${simulation.protein_level}"`);
    console.log(`Is Training Evaluated to: ${simulation.activity_level === 1.55 || simulation.activity_level === 1.725}`);
    }
    //-----------------PHASE SHIFT CHECK----------------------
    //  - Recalculates target calories for respective phase
    if (week == 5 || week == 9)
    {
        update_target_calories(simulation);
    }
    //=========== CALCULATIONS FOR WEEK'S WEIGHT LOSS/GAIN ===========//
    calculate_week_weight_change(simulation); // updates mass change in dictionary

    //====== BIOLOGICAL DISTRIBUTION OF FAT LOSS VS MUSCLE LOSS ======//
    calculate_fat_muscle_ratio(simulation); // updates fat/muscle ratios in dictionary

    let fat_change = simulation.mass_change * simulation.fat_ratio;
    let muscle_change = simulation.mass_change * simulation.muscle_ratio;

    //====== UPDATE SIMULATION VARIABLES AND PUSH ONTO HISTORIES ======//
    simulation.current_fat = simulation.current_fat - fat_change;
    simulation.current_lbm = simulation.current_lbm - muscle_change;
    simulation.current_weight = simulation.current_fat + simulation.current_lbm;
  
    update_histories(simulation);
};

    console.log("--CALCULATION RESULTS--");
    console.log(`Calculated Lean Body Mass: ${calculated_lbm.toFixed(2)} kg`);
    console.log(`Calculated Survival Energy Needs (BMR): ${calculated_bmr.toFixed(0)} kcal/day`);
    console.log(`Calculated Total Energy Burn (TDEE): ${calculated_TDEE.toFixed(0)}`);
    console.log(`Calculated Target Calories/day: ${calculated_target_calories.toFixed(0)}`);

// HTML Output Push
    document.getElementById('lbmOutput').textContent = `${calculated_lbm.toFixed(0)}`;
    document.getElementById('tdeeOutput').textContent = `${calculated_TDEE.toFixed(0)}`;

// Verification logs placed right outside the loop block scope
console.log(`===========================================`);
console.log(`       12-WEEK SIMULATION COMPLETE         `);
console.log(`===========================================`);
console.log(`Starting Weight: ${simulation.weight_history[0].toFixed(1)} kg`);
console.log(`Ending Weight:   ${simulation.current_weight.toFixed(1)} kg`);
console.log(`Ending LBM: ${simulation.lbm_history[12].toFixed(1)} kg`);
console.log(`Phase 1 Target:  ${simulation.calories_history[1].toFixed(0)} kcal`);
console.log(`Phase 3 Target:  ${simulation.calories_history[9].toFixed(0)} kcal`);
console.log(`===========================================`);

// Generate Graph
plot_graph(simulation.weight_history, simulation.lbm_history, simulation.fat_mass_history);

// Generate Target Calories
display_phase_roadmap(simulation.calories_history);
}

function plot_graph(weight_values, lbm_values, fat_values){
    // HTML drawing context
    const ctx = document.getElementById('trajectoryChart').getContext('2d');

    // Conditional that clears previously generated charts
    if(trajectory_chart !== null){
        trajectory_chart.destroy();
    }

    // Generate x axis week markers
    let timeline = [];
    for (week = 0; week <= 12; week++){
        timeline.push(`Week ${week}`);
    }

    // Form chart object
    trajectory_chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeline, // Maps X-axis labels
            datasets: [
                {
                    label: 'Total Body Weight (kg)',
                    data: weight_values, // First Y-axis data feed
                    borderColor: '#1a1a1a', // Clean charcoal line color
                    backgroundColor: 'rgba(26, 26, 26, 0.1)',
                    borderWidth: 3,
                    tension: 0.2 // Gives the line a slight, smooth curve
                },
                {
                    label: 'Lean Muscle Mass (kg)',
                    data: lbm_values, // Second Y-axis data feed
                    borderColor: '#2ecc71', // Bright biometric green color
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 3,
                    tension: 0.2
                },
                {
                    label: 'Fat Body Mass (kg)',
                    data: fat_values, // Third Y-axis data feed
                    borderColor: '#e74c3c', // Alarming fat-loss red color
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5], // Renders this line dashed to look like a sub-metric
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,

            layout: {
                padding: {
                    top: 45,
                    right: 75,
                    left: 10
                }
            },

            plugins: {
                legend: { 
                    position: 'bottom',
                 },
                labels: {
                    boxWidth: 20,
                    padding: 20,
                    font: {
                        size: 11
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Mass (Kilograms)'
                    },
                    // THE FIX: Tells the chart engine NOT to start at 0.
                    // It will automatically zoom in on your specific data range!
                    beginAtZero: false,
                    grace: '5%' // Adds a tiny 5% visual cushion above and below your lines
                }
             }
        },

        plugins: [phase_dividers_plugin] 
    });
}

// Function: Renders phase-based coaching values directly to the webpage text nodes
function display_phase_roadmap(target_calories_values) {
    // 1. Extract the specific calorie targets using your milestone array checkpoints
    let phase1_target = target_calories_values[1];
    let phase2_target = target_calories_values[5];
    let phase3_target = target_calories_values[9];

    // 2. Overwrite the screen text placeholders using formatted whole numbers
    document.getElementById('phase1Cal').textContent = phase1_target.toFixed(0);
    document.getElementById('phase2Cal').textContent = phase2_target.toFixed(0);
    document.getElementById('phase3Cal').textContent = phase3_target.toFixed(0);

    // 3. Turn on the summary container box by changing its CSS display property from "none" to "block"
    document.getElementById('phase-roadmap').style.display = "block";
}

function calculate_fat_muscle_ratio(simulation) {
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: calculates and returns ratio of muscle and fat loss/gain out of total weight lost/gained
//                      based on user's protein intake and muscle stimuli/activity
//      - Utilizes Forbes ratios and NIH data to determine catabolic/anabolic ratios
// ----------------------------------------------------------------------------------------------------------

    let is_training = (simulation.activity_level === 1.55 || simulation.activity_level === 1.725);

    if (simulation.mass_change >= 0){
        //=========================//
        //==== BODY IN DEFICIT ====//
        //=========================//
        if (simulation.protein_level == "Low"){
            if (is_training){
                // Insufficient protein + Consistent Lifting = partially saves muscle
                simulation.fat_ratio = 0.85;
                simulation.muscle_ratio = 0.15;
            } else {
                // Insufficient Protein + Inconsistent Lifting
                simulation.fat_ratio = 0.7;
                simulation.muscle_ratio = 0.3;
            }
        } else if (simulation.protein_level == "High"){
            if (is_training){
                // High Protein + Consistent Lifting = Best Case
                simulation.fat_ratio = 0.98;
                simulation.muscle_ratio = 0.2;
            } else {
                //  High Protein + Inconsistent Lifting
                simulation.fat_ratio = 0.80;
                simulation.muscle_ratio = 0.20;
            }
        } else if (simulation.protein_level == "Moderate") {
            //Moderate Protein
            simulation.fat_ratio = is_training ? 0.85 : 0.75;
            simulation.muscle_ratio = is_training ? 0.15 : 0.25;
        }
    } else if (simulation.mass_change < 0){
        //=========================//
        //==== BODY IN SURPLUS ====//
        //=========================//
        if (simulation.protein_level === "Low") {
            // If protein is low, gains shift heavily toward fat regardless of training
            simulation.fat_ratio = is_training ? 0.55 : 0.75;
            simulation.muscle_ratio = is_training ? 0.45 : 0.25;
        } else if (simulation.protein_level === "High") {
            // High Protein + Training = Maximum Lean Mass Growth Optimization
            simulation.fat_ratio = is_training ? 0.30 : 0.50;
            simulation.muscle_ratio = is_training ? 0.70 : 0.50;
        } else if (simulation.protein_level == "Moderate") {
            // Moderate Protein Baseline
            simulation.fat_ratio = is_training ? 0.40 : 0.60;
            simulation.muscle_ratio = is_training ? 0.60 : 0.40;
        }
    }
}

function calculate_week_weight_change(sim){
    // METABOLIC EXPENDITURE OF CURRENT AVATAR
    let calculated_bmr = calculate_bmr(sim.current_lbm);
    sim.current_TDEE = calculate_tdee(calculated_bmr, sim.activity_level);

    // BODY MASS LOSS/GAIN DUE TO DEFICIT/SURPLUS (7700 kcal per kg)
    let weekly_calorie_deficit = (sim.current_TDEE -  sim.current_target) * 7
    sim.mass_change = weekly_calorie_deficit / 7700;
}

function update_target_calories(sim){
    let calculated_bmr = calculate_bmr(sim.current_lbm);
    let calculated_TDEE = calculate_tdee(calculated_bmr, sim.activity_level);
    sim.current_target = calculate_target_intake(calculated_TDEE, sim.diet_choice);
}

function update_histories(simulation){
    simulation.weight_history.push(simulation.current_weight);
    simulation.lbm_history.push(simulation.current_lbm);
    simulation.fat_mass_history.push(simulation.current_fat);
    simulation.calories_history.push(simulation.current_target);
    simulation.protein_history.push(simulation.current_protein);
}

function calculate_lbm(weight, body_fat_percent){
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: calculates lean body mass using the user's total weight and body fat percentage
//      - utilizes Direct Body Fat Formula to accurately represent muscle mass; two users can have similar
//        heights and weights, but differ wildly in muscle mass.
//      - LBM = BODY_WEIGHT x (1 - BODY_FAT_DECIMAL)
// ----------------------------------------------------------------------------------------------------------

    //converts body fat percentage into a decimal for calculations
    let body_fat_decimal = body_fat_percent / 100;

    //calculates lbm
    let lbm = weight * (1 - body_fat_decimal);

    return lbm;
}

function calculate_protein(weight, protein_input){
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: calculates protein goal user should reach based on their input and their weight
//      - Low: 1.2g/kg/day   - Moderate: 1.6g/kg/day    - High 2.0g/kg/day
//      - (National Institute of Health)
// ----------------------------------------------------------------------------------------------------------

    //converts body fat percentage into a decimal for calculations
    let protein_goal = weight;

    //calculates lbm
    if (protein_input == "Low"){
        protein_goal *= 1.2;

    } else if (protein_input == "Moderate"){
        protein_goal *= 1.6;

    } else if (protein_input == "High"){
        protein_goal *= 2;
    }

    return protein_goal;
}


function calculate_bmr(lbm){
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: calculates basal metabolic rate of user of user using their lean body mass
//
//                       ==   (base calories burned per day at absolute rest)   ==
//
//      - utilizes Katch-McArdle Formula to accurately represent metabolic needs of user's muscle mass
//      - BMR = 370 + (21.6 x LBM)
// ----------------------------------------------------------------------------------------------------------
    const baseline_offset = 370; // constant representing basic metabolic function
    const multiplier_coefficient = 21.6; // multiplier added for every kg of non-fat tissue

    return(baseline_offset + (multiplier_coefficient * lbm));
}


function calculate_tdee(bmr, activity_constant){
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: calculates Total Daily Energy Expenditure using user's Basal Metabolic Rate and Activity
//      - utilizes standard multipliers established by the Institute of Medicine
//      - 1.2   -> Sedentary          (Desk Job, little to no structured workouts)
//      - 1.375 -> Lightly Active     (Light intentional movements/sports 1-3 times a week)
//      - 1.55  -> Moderately Active  (Hard, intentional exercises 3-5 days a week)
//      - 1.725 -> Very Active        (Hard daily training, or physically intense job eg nurse, construction worker)
//      FORMULA:
//      - TDEE = BASAL_METABOLIC_RATE * ACTIVITY_MULTIPLIER
// ----------------------------------------------------------------------------------------------------------

    return(bmr * activity_constant);
}

function calculate_target_intake(tdee, goal_input){
// ---------------------------------------------------------------------------------------------------------
//      FUNCTION NOTES: calculates target calories depending on user's deficit/surplus goals
//      - OUTPUT: target_calories        - INPUT: goal_choice
//      - TARGET_INTAKE = TDEE - DYNAMIC_ADJUSTMENT
// ----------------------------------------------------------------------------------------------------------
    let dynamic_adjustment = tdee * goal_input; // input assumes deficit to be positive; calculates calorie size of deficit/surplus
    let target_calories = tdee - dynamic_adjustment;

    return(target_calories);
}


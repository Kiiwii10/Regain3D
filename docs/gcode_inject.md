# G-Code Injector Design info

When a 3D printer switches between different filaments (e.g., changing colors or material types), it must purge, or extrude, a certain amount of filament to clear the nozzle of the old material and ensure the new material prints cleanly. The default purge amounts are often conservative and lead to significant waste, especially in prints with many filament changes.

The main purpose of the injector is to alter the plastic changing procedure and break it into 2 parts, let us name the plastic being changed as old plastic and the new inserted plastic as new plastic.

To be able to adapt this new procedure, we need to be able to alert the ESP of what plastics are being used, when we enter purge procedure, when we pause, etc. For some printers, we do this through the gcode, like with bambu lab printers (inject commands to the msg field using m117 command).
gcode injector functionality needs to be printer agnostic. it needs to be able to tackle different types of gcode from different types of printers. it will need to gather information from the gcode code and in other cases get more information from outside sources to undestand: what plastics are being used, what printer is being used, how much to extrude in the pruge procedure, etc.

by tackling different kinds of gcode from different printers, the gcode injector will need to inject commands based on the communication the esp uses to track the printing process, if such communication is needed through the gcode (like in bambu labs case)

we can take reference in https://github.com/ChristopherHoffman/Slic3rPostProcessingUploader/tree/main for better understand of some (parts) of gcode templates, how to work with them to some degree, and general information that may help us.

## an example tool change \ purging procedure in bambu lab printers:

; WIPE_TOWER_END
; LAYER_HEIGHT: 0.160000
; FEATURE: Prime tower
; LINE_WIDTH: 0.500000
;--------------------
; CP TOOLCHANGE START
; toolchange #1
; material : PLA -> PLA
;--------------------
M220 B
M220 S100
; WIPE_TOWER_START
G1 E-2 F1800
G17
G3 Z25.08 I1.217 J0 P1 F5400
; filament end gcode

M620 S2A
M204 S9000
G1 Z27.68 F1200

G1 X70 F21000
G1 Y245
G1 Y265 F3000
M400
M106 P1 S0
M106 P2 S0

M104 S220

M620.11 S0

M400
G1 X90
G1 Y255 F4000
G1 X100 F5000
G1 X120 F15000
G1 X20 Y50 F21000
G1 Y-3

M620.1 E F374 T240
T2
M73 E81
M620.1 E F523 T240

M620.11 S0

G92 E0

M83
; FLUSH_START
; always use highest temperature to flush
M400

M109 S240

G1 E23.7 F374 ; do not need pulsatile flushing for start part
G1 E0.609241 F50
G1 E7.00627 F374
G1 E0.609241 F50
G1 E7.00627 F523
G1 E0.609241 F50
G1 E7.00627 F523
G1 E0.609241 F50
G1 E7.00627 F523

; FLUSH_END
G1 E-2 F1800
G1 E2 F300

G91
G1 X3 F12000; move aside to extrude
G90
M83

; FLUSH_START
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
; FLUSH_END
G1 E-2 F1800
G1 E2 F300

G91
G1 X3 F12000; move aside to extrude
G90
M83

; FLUSH_START
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
; FLUSH_END
G1 E-2 F1800
G1 E2 F300

G91
G1 X3 F12000; move aside to extrude
G90
M83

; FLUSH_START
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
G1 E9.74917 F523
M73 P18 R185
G1 E1.08324 F50
G1 E9.74917 F523
G1 E1.08324 F50
; FLUSH_END

; FLUSH_START
M400
M109 S220
G1 E2 F523 ;Compensate for filament spillage during waiting temperature
; FLUSH_END
M400
G92 E0
G1 E-2 F1800
M106 P1 S255
M400 S3

G1 X70 F5000
M73 P19 R184
G1 X90 F3000
G1 Y255 F4000
G1 X105 F5000
G1 Y265
G1 X70 F10000
G1 X100 F5000
G1 X70 F10000
G1 X100 F5000

G1 X70 F10000
G1 X80 F15000
G1 X60
G1 X80
G1 X60
G1 X80 ; shake to put down garbage
G1 X100 F5000
G1 X165 F15000; wipe and shake
G1 Y256 ; move Y to aside, prevent collision
M400
G1 Z27.68 F3000

M204 S4000

M621 S2A
M106 S255
M106 P2 S178
G1 X173.998 Y247.991 F30000
G1 Z24.68
G1 X181.63 Y247.991 Z25.08
G1 X210.735 Y247.991 Z25.08
G1 X210.735 Y215.292
G1 X205.035 Y215.292

; filament start gcode
M106 P3 S150

M142 P1 R35 S40
G1 Z24.68
G1 E2 F1800

G4 S0
; CP TOOLCHANGE WIPE
; LAYER_HEIGHT: 0.200000
M204 S4000
G1 X202.035 Y215.292 E0.1140 F1782
G1 E-0.8000 F1800
M204 S10000
G1 X206.535 F600
G1 X202.035 F240
G1 E0.8000 F1800
M204 S4000
G1 X171.035 E1.1782 F1782
; LAYER_HEIGHT: 0.160000
G1 Y214.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F2025
; LAYER_HEIGHT: 0.160000
G1 Y214.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F2473
; LAYER_HEIGHT: 0.160000
G1 Y213.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F4725
; LAYER_HEIGHT: 0.160000
G1 Y213.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F4775
; LAYER_HEIGHT: 0.160000
G1 Y212.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F4825
; LAYER_HEIGHT: 0.160000
G1 Y212.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F4875
; LAYER_HEIGHT: 0.160000
G1 Y211.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F4925
; LAYER_HEIGHT: 0.160000
G1 Y211.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F4975
; LAYER_HEIGHT: 0.160000
G1 Y210.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F5025
; LAYER_HEIGHT: 0.160000
G1 Y210.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F5075
; LAYER_HEIGHT: 0.160000
G1 Y209.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F5125
; LAYER_HEIGHT: 0.160000
G1 Y209.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F5175
; LAYER_HEIGHT: 0.160000
G1 Y208.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F5225
; LAYER_HEIGHT: 0.160000
G1 Y208.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F5275
; LAYER_HEIGHT: 0.160000
G1 Y207.792 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X205.035 E1.2922 F5325
; LAYER_HEIGHT: 0.160000
G1 Y207.292 E0.0155
; LAYER_HEIGHT: 0.200000
G1 X171.035 E1.2922 F5375
; LAYER_HEIGHT: 0.160000
G1 Y206.792 E0.0155
G1 X205.035 E1.0532 F5400
; WIPE_TOWER_END
M220 R
G1 F30000
G4 S0
G92 E0
; CP TOOLCHANGE END
;------------------

Of course. This is a great piece of G-code to analyze because it showcases the complexity and elegance of the Bambu Lab tool change process. It's much more than just a simple filament swap.

Here is a detailed, section-by-section breakdown of what's happening.

---

### High-Level Overview

The entire process can be broken down into five main phases:

1.  **Unloading:** Retracting and physically removing the old filament (PLA).
2.  **Transition:** Moving the toolhead to the "poop chute" and preparing for the new filament.
3.  **Loading & Purging:** Loading the new filament (PLA) and flushing it through the nozzle to clear out the old color. This is where the "poop" is created.
4.  **Cleaning:** Wiping the nozzle on the dedicated wiper blade and shaking off any residue.
5.  **Resuming:** Preparing the nozzle and moving back to the print.

---

### Detailed Code Explanation

#### Phase 1: Unloading the Old Filament

```gcode
;--------------------
; CP TOOLCHANGE START
; toolchange #81
; material : PLA -> PLA
;--------------------
M220 B
M220 S100
```

- **`M220 B` / `M220 S100`**: `M220` sets the feed rate override percentage. These commands reset the override to a known state (100%) to ensure the tool change movements happen at their programmed speeds.

```gcode
; WIPE_TOWER_START
G1 E-2 F1800
G17
G3 Z34.2 I1.217 J0 P1  F5400
```

- **`G1 E-2 F1800`**: A standard retraction. It pulls the filament back by 2mm to prevent oozing.
- **`G17`**: Selects the XY plane for circular interpolation.
- **`G3 ...`**: This is a counter-clockwise arc move. It's moving the toolhead in a smooth curve, likely on the prime tower, to finish the last printed segment neatly.

```gcode
; filament end gcode
M620 S1A
```

- **`M620 S1A`**: This is a **critical custom Bambu command**. `M620` is the filament change command. `S1` instructs it to **unload** the current filament, and `A` likely specifies the target (the extruder). The printer now begins the physical process of pulling the filament all the way back to the AMS unit.

---

#### Phase 2: Transition and Preparation

```gcode
M204 S9000
G1 Z36.8 F1200

G1 X70 F21000
G1 Y245
G1 Y265 F3000
M400
```

- **`M204 S9000`**: Sets the acceleration for travel moves to 9000 mm/s².
- **`G1 Z36.8 F1200`**: Lifts the Z-axis to a safe height to avoid hitting the print.
- **`G1 X70... G1 Y265...`**: Moves the toolhead to the back-left corner of the printer, positioning it directly over the "poop chute".
- **`M400`**: Wait for all previous moves to complete.

```gcode
M106 P1 S0
M106 P2 S0
M104 S220
M620.11 S0
M400
```

- **`M106 P1 S0 / P2 S0`**: Turns off the part cooling fan (`P1`) and the chamber fan (`P2`).
- **`M104 S220`**: Sets the nozzle's target temperature to 220°C (but doesn't wait for it to be reached). This is the temperature for the new PLA filament.
- **`M620.11 S0`**: A custom command, likely related to filament sensors or cutter status. `S0` probably means "off" or "idle".

```gcode
G1 X90
G1 Y255 F4000
...
G1 X20 Y50 F21000
G1 Y-3
```

- This series of `G1` moves is a small "dance" to position the toolhead precisely before loading the new filament. The move to `Y-3` brings it slightly forward.

```gcode
M620.1 E F374 T240
T1
M73 E1
M620.1 E F149 T240
```

- **`M620.1 ...`**: These appear to be custom commands that configure the extruder motor for the loading process, possibly setting speeds or pressures.
- **`T1`**: This is the **official tool change command**. It tells the firmware to switch its active tool from the previous one (e.g., `T0`) to Tool 1 (the filament in the second AMS slot). The printer now starts feeding the new filament from the AMS towards the extruder.
- **`M73 E1`**: A command to update the printer's progress, likely indicating the start of the next phase.

---

#### Phase 3: Loading and Purging the New Filament (The "Poop")

```gcode
M620.11 S0
G92 E0
M83
; FLUSH_START
M400
M109 S240
```

- **`G92 E0`**: Resets the extruder's position to zero.
- **`M83`**: Sets the extruder to use relative positioning (e.g., `E10` means extrude 10mm from the current position).
- **`M400`**: Waits for moves to complete.
- **`M109 S240`**: **Sets and waits** for the nozzle to reach a high temperature of 240°C. This is hotter than needed for PLA and is done intentionally to ensure any residue from the previous filament is thoroughly melted and flushed out.

```gcode
G1 E23.7 F374 ; do not need pulsatile flushing for start part
G1 E0.386606 F50
G1 E4.44597 F374
...
```

- This is the **pulsatile flushing** process. The code alternates between extruding a lot of filament fast (`F374`) and a tiny bit very slowly (`F50`). This creates pressure changes inside the nozzle, which helps to "scrub" the walls and clean out the old color more effectively than a single, constant-speed extrusion. This is the first part of the filament "poop".

```gcode
G1 E-2 F1800
G1 E2 F300
```

- A quick retract and un-retract sequence to relieve pressure.

```gcode
G91
G1 X3 F12000; move aside to extrude
G90
M83
; FLUSH_START
M73 P96 R6
... (more G1 E... commands) ...
```

- **`G91`/`G90`**: Switch to relative (`G91`) and back to absolute (`G90`) positioning for a quick sideways move. This breaks the purge line into two segments.
- **`M73 P96 R6`**: Updates the print progress on the screen. `P96` means 96% complete, and `R6` means 6 minutes remaining. The slicer has calculated that this tool change happens at the 96% mark.
- The second block of `G1 E...` commands is more pulsatile flushing, creating the second part of the "poop".

---

#### Phase 4: Cleaning the Nozzle (The "Wipe Dance")

````gcode
; FLUSH_START
M400
M109 S210
G1 E2 F149 ;Compensate for filament spillage during waiting temperature
; FLUSH_END```
*   **`M109 S210`**: Lowers the temperature and waits for it to reach 210°C, the actual printing temperature for this PLA.
*   **`G1 E2 F149`**: A small prime extrusion to compensate for any oozing while the temperature was changing.

```gcode
M400
G92 E0
G1 E-2 F1800
M106 P1 S255
M400 S3
````

- **`G92 E0 / G1 E-2`**: Reset the extruder and retract again to prevent drips during the wipe.
- **`M106 P1 S255`**: Turns the part cooling fan on to full blast. This helps rapidly cool and solidify the filament on the nozzle tip, making it "break" off cleanly during the wipe.
- **`M400 S3`**: Wait for up to 3 seconds for moves to finish.

```gcode
G1 X70 F5000
G1 X90 F3000
...
G1 X60
G1 X80 ; shake to put down garbage
G1 X100 F5000
G1 X165 F15000; wipe and shake
```

- This is the **wipe sequence**. The toolhead performs a series of precise movements that drag the nozzle tip across a metal wiper blade located at the back of the printer. The rapid back-and-forth "shake" (`G1 X60`, `G1 X80`) is designed to use inertia to flick off any stubborn, dangling bits of filament.

---

#### Phase 5: Preparing to Resume Printing

```gcode
G1 Y256 ; move Y to aside, prevent collision
M400
G1 Z36.8 F3000
M204 S4000
```

- Moves clear of the wipe mechanism and resets the acceleration to a normal printing value (`S4000`).

```gcode
M621 S1A
M106 S56.1
M106 P2 S178
G1 X176.737 Y247.991 F30000
```

- **`M621 S1A`**: Another **custom Bambu command**. `M621` is likely a filament sensor check. It confirms that the new filament is loaded correctly and detected by the sensors before resuming the print.
- **`M106...`**: Sets the fan speeds to the required values for the next part of the print.
- **`G1 X... Y...`**: A high-speed travel move to the position of the prime tower.

```gcode
; filament start gcode
M106 P3 S255
G1 Z33.8
G1 E2 F1800
G4 S0
; CP TOOLCHANGE WIPE
```

- **`M106 P3 S255`**: Turns on the chamber fan (if present).
- **`G1 Z33.8`**: Lowers the Z-axis to the correct printing height.
- **`G1 E2 F1800`**: An un-retraction or "prime" move. It pushes the 2mm of filament that was retracted back into the nozzle, getting it ready to print.
- **`G4 S0`**: A brief pause.
- The final comment indicates the end of the tool change sequence. The very next lines will be the actual printing moves for the new color.

## Adaption and processing

we wish to split the process of tool change \ purging into 2 parts.

assume we purge in total X fillament.

we want the process to be exactly the same but broken into 2 stage.
phases 1 and 2 are the same.
in Phase 3 we purge Y material instead of X
in phase 4 we do the same.
we repeat phase 3 with X-Y fillament,
in phase 4 we blow the plastic with cool air and pause.
when resumed we finish phase 4 and proceed to phase 5.

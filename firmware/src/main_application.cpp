#include <Arduino.h>
#include <Logger.h>
#include <Utils.h>
#include <ApplicationManager.h>
#include <MotorController.h>

// Include the correct printer header based on the build flags


#if defined(PRINTER_TYPE_BAMBU)
    #include "bambu/BambuPrinter.h"
#elif defined(PRINTER_TYPE_PRUSA)
    #include "prusa/PrusaPrinter.h"
#else
    #error "No printer type defined in build flags"
#endif

ApplicationManager* appManager = nullptr;
BasePrinter* printer = nullptr;
MotorController* motor = nullptr;

void setup() {
    Logger::init(200, LOG_INFO);
    LOG_I("Main", "Starting ESP32 3D Waste Controller - Application");
    
    Utils::printSystemInfo();
    
    // 1. Create the motor controller
    motor = new MotorController();

    // 2. Create the specific printer object
    #if defined(PRINTER_TYPE_BAMBU)
        printer = new BambuPrinter(motor);
    #elif defined(PRINTER_TYPE_PRUSA)
        printer = new PrusaPrinter(motor);
    #endif

    // 3. Create the ApplicationManager and inject the printer and motor so it reuses a single controller
    appManager = new ApplicationManager(printer, motor);
    
    // 4. Initialize the ApplicationManager
    #if defined(PRINTER_TYPE_BAMBU)
        if (!appManager->init("Bambu")) {
            LOG_E("Main", "Failed to initialize Application Manager");
            Utils::rebootDevice(5000);
        }
    #elif defined(PRINTER_TYPE_PRUSA)
        if (!appManager->init("Prusa")) {
            LOG_E("Main", "Failed to initialize Application Manager");
            Utils::rebootDevice(5000);
        }
    #endif
    
    LOG_I("Main", "Application setup complete");
}

void loop() {
    if (appManager) {
        appManager->loop();
    }
    
    delay(50);
}

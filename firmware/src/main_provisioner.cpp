#include <Arduino.h>
#include <Logger.h>
#include <Utils.h>
#include <ProvisioningManager.h>

ProvisioningManager* provisioningManager = nullptr;

void setup() {
    Logger::init(50, LOG_INFO);
    LOG_I("Main", "Starting ESP32 3D Waste Controller - Provisioner");
    
    Utils::printSystemInfo();
    
    // **BOOT DECISION LOGIC**
    // Check if we should boot into application instead of staying in provisioner
    if (Utils::shouldBootIntoApplication()) {
        LOG_I("Main", "Switching to application firmware...");
        
        if (Utils::switchToApplicationPartition()) {
            LOG_I("Main", "Boot partition switched - rebooting to application");
            Utils::rebootDevice(2000);
        } else {
            LOG_E("Main", "Failed to switch boot partition - continuing with provisioner");
        }
    }
    
    LOG_I("Main", "Staying in provisioner mode");
    
    provisioningManager = new ProvisioningManager();
    if (!provisioningManager->init()) {
        LOG_E("Main", "Failed to initialize Provisioning Manager");
        Utils::rebootDevice(5000);
    }
    
    LOG_I("Main", "Provisioner setup complete");
}

void loop() {
    if (provisioningManager) {
        provisioningManager->loop();
        
        // if (provisioningManager->isProvisioningComplete()) {
        //     LOG_I("Main", "Provisioning completed successfully");
        //     delete provisioningManager;
        //     provisioningManager = nullptr;
            
        //     while (true) {
        //         delay(1000);
        //     }
        // }
    }
    
    delay(100);
}

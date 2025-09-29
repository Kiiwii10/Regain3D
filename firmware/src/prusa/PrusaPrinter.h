#pragma once

#include <BasePrinter.h>
#include <MotorController.h>
#include <vector>

/**
 * @brief Minimal Prusa printer implementation
 *
 * This class provides a barebones implementation of the BasePrinter
 * interface so the firmware can be compiled and extended in the future.
 */
class PrusaPrinter : public BasePrinter {
public:
    explicit PrusaPrinter(MotorController* motor);
    ~PrusaPrinter();

    // BasePrinter implementation
    bool init() override;
    bool connect(const String& connectionParams) override;
    void disconnect() override;
    void loop() override;
    bool isConnected() const override;
    PrintStatus getPrintStatus() const override;
    int getMaterialInfo(std::vector<MaterialInfo>& materials) const override;
    bool sendCommand(const String& command) override;
    void parseMessage(const String& message) override;
    String getStatusJson() const override;
    String getPrinterType() const override { return "Prusa"; }
    bool saveConfiguration(const String& configJson) override;

private:
    bool connected;
    PrintStatus status;
    MotorController* motor;
};


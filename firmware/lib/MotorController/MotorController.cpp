#include "MotorController.h"
#include <Arduino.h>

MotorController::MotorController(uint8_t stepPin, uint8_t dirPin, const uint8_t rowPins[MOTOR_ROWS], const uint8_t colPins[MOTOR_COLS])
    : _stepper(AccelStepper::DRIVER, stepPin, dirPin),
      _rowPins(rowPins),
      _colPins(colPins),
      _currentState(IDLE),
      _targetPosition(-1),
      _lastKnownPosition(-1) {}

void MotorController::begin() {
    _stepper.setMaxSpeed(2000.0);
    // Note: We use runSpeed(), so acceleration is not used.
    // _stepper.setAcceleration(1000.0);

    for (int i = 0; i < MOTOR_ROWS; i++) {
        pinMode(_rowPins[i], OUTPUT);
        digitalWrite(_rowPins[i], LOW);
    }

    for (int i = 0; i < MOTOR_COLS; i++) {
        pinMode(_colPins[i], INPUT_PULLDOWN);
    }
}

void MotorController::loop() {
    // This function implements the state machine
    switch (_currentState) {
        case IDLE:
            // Do nothing while idle.
            break;

        case SEEKING: {
            // Check if we have arrived at the target.
            int currentPos = getCurrentPosition();
            if (currentPos == _targetPosition) {
                _stepper.stop();       // Stop motor movement
                _currentState = HOLDING; // Transition to HOLDING state
                _lastKnownPosition = currentPos;
            } else {
                // If not at the target, keep running the motor.
                _stepper.runSpeed();
            }
            break;
        }

        case HOLDING: {
            // While holding, check if the motor has been pushed off its position.
            int currentPos = getCurrentPosition();
            if (currentPos != _targetPosition) {
                // If the motor is no longer at the target, start seeking again.
                // This creates a "closed-loop" correction behavior.
                _currentState = SEEKING;
                // Note: The motor speed is already set from the last moveToPosition command.
            }
            break;
        }
    }
}

//TODO: make it move in the shortest direction using the _lastKnownPosition
void MotorController::moveToPosition(int targetPosition, float speed) {
    if (targetPosition < 1 || targetPosition > (MOTOR_ROWS * MOTOR_COLS)) {
        return; // Invalid target
    }

    _targetPosition = targetPosition;
    _stepper.setSpeed(speed);
    _currentState = SEEKING; // Set the state to start the process in the loop()
}

void MotorController::stop() {
    _stepper.stop();
    _currentState = IDLE;
    _targetPosition = -1;
}

int MotorController::getCurrentPosition() {
    for (int r = 0; r < MOTOR_ROWS; r++) {
        digitalWrite(_rowPins[r], HIGH);
        // A small delay can help stabilize readings on some hardware.
        delayMicroseconds(50); 
        for (int c = 0; c < MOTOR_COLS; c++) {
            if (digitalRead(_colPins[c]) == HIGH) {
                digitalWrite(_rowPins[r], LOW);
                return (r * MOTOR_COLS) + c + 1; // Position 1-20
            }
        }
        digitalWrite(_rowPins[r], LOW);
    }
    return _lastKnownPosition; // No position detected
}

MotorController::MotorState MotorController::getState() {
    return _currentState;
}

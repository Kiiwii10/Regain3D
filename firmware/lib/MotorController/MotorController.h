#pragma once

#include <AccelStepper.h>
#include <Config.h>

class MotorController {
public:
    /**
     * @brief Defines the operational states of the motor.
     */
    enum MotorState {
        IDLE,       // Motor is stopped and not holding a position.
        SEEKING,    // Motor is actively moving towards a target position.
        HOLDING     // Motor has reached the target and is actively maintaining its position.
    };

    /**
     * @brief Construct a new Motor Controller object.
     *
     * @param stepPin The GPIO pin for the STEP signal.
     * @param dirPin The GPIO pin for the DIRECTION signal.
     * @param rowPins An array of 4 GPIO pin numbers for the matrix rows.
     * @param colPins An array of 5 GPIO pin numbers for the matrix columns.
     */
    MotorController(
        uint8_t stepPin = MOTOR_STEP_PIN,
        uint8_t dirPin = MOTOR_DIRECTION_PIN, 
        const uint8_t rowPins[] = MOTOR_ROW_PINS, 
        const uint8_t colPins[] = MOTOR_COL_PINS);

    /**
     * @brief Initializes the motor and GPIO pins. Call this in your global setup().
     */
    void begin();

    /**
     * @brief The main update loop for the motor controller.
     *        This function must be called continuously from the main program loop()
     *        to manage motor state and movement. It is non-blocking.
     */
    void loop();

    /**
     * @brief Commands the motor to start moving towards a target position.
     *        This is an asynchronous command that changes the motor's state to SEEKING.
     *
     * @param targetPosition The desired position (1-20).
     * @param speed The speed in steps per second. Positive moves forward, negative moves backward.
     */
    void moveToPosition(int targetPosition, float speed = 800.0);

    /**
     * @brief Stops the motor immediately and sets its state to IDLE.
     */
    void stop();
    
    /**
     * @brief Scans the 4x5 matrix to get the motor's current position.
     *
     * @return The current position (1-20), or -1 if no sensor is active.
     */
    int getCurrentPosition();

    /**
     * @brief Gets the current state of the motor.
     *
     * @return The current MotorState (IDLE, SEEKING, or HOLDING).
     */
    MotorState getState();

private:
    AccelStepper _stepper;
    const uint8_t* _rowPins;
    const uint8_t* _colPins;

    // State machine variables
    MotorState _currentState;
    int _targetPosition;
    int _lastKnownPosition;
};


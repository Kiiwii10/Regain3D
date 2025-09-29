#include <Arduino.h>
#include <unity.h>
#include <Logger.h>
#include <ArduinoJson.h>

static void test_ring_buffer_overwrite() {
    Logger::setTransmitCallback(nullptr); // disable auto-transmit side effects
    Logger::init(5, LOG_DEBUG);

    for (int i = 0; i < 7; ++i) {
        LOG_I("T", String("m") + String(i));
    }

    TEST_ASSERT_EQUAL_UINT(5, Logger::getLogCount());

    String json = Logger::getLogsAsJson();
    JsonDocument doc;
    auto err = deserializeJson(doc, json);
    TEST_ASSERT_EQUAL_MESSAGE(DeserializationError::Ok, err, "JSON parse failed");

    TEST_ASSERT_TRUE(doc["logs"].is<JsonArrayConst>() || doc["logs"].is<JsonArray>());
    auto logs = doc["logs"].as<JsonArrayConst>();
    TEST_ASSERT_EQUAL(5, logs.size());

    // Earliest should be m2 (we logged m0..m6 with capacity 5)
    TEST_ASSERT_EQUAL_STRING("m2", logs[0]["message"].as<String>().c_str());
    TEST_ASSERT_EQUAL_STRING("m6", logs[4]["message"].as<String>().c_str());
}

static void test_transmit_no_reentrancy_and_clear() {
    volatile bool invoked = false;
    Logger::init(3, LOG_DEBUG);
    Logger::clearLogs();

    Logger::setTransmitCallback([&](const String& data) {
        invoked = true;
        // This log should be ignored by Logger due to inTransmit guard
        LOG_I("TEST", "inside transmit");
        TEST_ASSERT_TRUE(data.length() > 0);
    });

    // Fill to capacity -> triggers transmit
    LOG_I("T", "a");
    LOG_I("T", "b");
    LOG_I("T", "c");

    TEST_ASSERT_TRUE(invoked);
    TEST_ASSERT_EQUAL_UINT(0, Logger::getLogCount());

    // After transmit, logging works normally
    LOG_I("T", "after");
    TEST_ASSERT_EQUAL_UINT(1, Logger::getLogCount());
}

static void test_transmit_not_called_when_empty() {
    volatile bool invoked = false;
    Logger::init(4, LOG_DEBUG);
    Logger::clearLogs();
    Logger::setTransmitCallback([&](const String&) { invoked = true; });

    // No logs present
    TEST_ASSERT_EQUAL_UINT(0, Logger::getLogCount());
    Logger::transmitLogs();
    TEST_ASSERT_FALSE(invoked);
}

void setup() {
    delay(2000);
    Serial.begin(115200);
    delay(200);
    UNITY_BEGIN();
    RUN_TEST(test_ring_buffer_overwrite);
    RUN_TEST(test_transmit_no_reentrancy_and_clear);
    RUN_TEST(test_transmit_not_called_when_empty);
    UNITY_END();
}

void loop() {}

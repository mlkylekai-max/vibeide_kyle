#include <math.h>
#include <stdio.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"

#define SINE_SAMPLE_MS 50
#define SINE_HZ 0.5f

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static const char *TAG = "vibeide_serial";

void app_main(void)
{
    uint32_t sample = 0;
    const float dt = (float)SINE_SAMPLE_MS / 1000.0f;

    ESP_LOGI(TAG, "serial sine wave test started: 115200 baud, %d ms/sample", SINE_SAMPLE_MS);

    while (true) {
        const float t = (float)sample * dt;
        const float value = sinf(2.0f * (float)M_PI * SINE_HZ * t);
        printf("sin:%.4f\n", value);
        fflush(stdout);
        sample += 1;
        vTaskDelay(pdMS_TO_TICKS(SINE_SAMPLE_MS));
    }
}

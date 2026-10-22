// Mixer de Audio: Arduino Nano ATmega328P, 5 V / 16 MHz, USB serial 115200.
// OLED SSD1306 I2C: SDA=A4, SCL=A5. Potentiometers: A0, A1, A2, A3.
// MX Nano v2: 64-byte packets followed by CRC-16/CCITT-FALSE, low byte first.
#include <Wire.h>
#include <U8g2lib.h>

#if !defined(__AVR_ATmega328P__) || F_CPU != 16000000UL
#error Select Arduino Nano with ATmega328P at 16 MHz.
#endif

U8G2_SSD1306_128X64_NONAME_1_HW_I2C oled(U8G2_R0, U8X8_PIN_NONE);
const uint8_t POT_PINS[4] = {A0, A1, A2, A3};
uint8_t rx[66], tx[64], rxCount = 0;
uint8_t icons[4][32] = {};
uint16_t raw[4], filtered[4], accepted[4];
uint8_t physical[4], levels[4];
uint8_t layout = 0, active = 0, pendingChanges = 15, oledAddress = 0;
uint32_t lastSample = 0, lastPaint = 0, lastSend = 0, lastRx = 0;
bool dirty = true, oledOnline = false, pendingCommand = false;

uint16_t crc16(const uint8_t *data, uint8_t length) {
  uint16_t crc = 0xffff;
  for (uint8_t i = 0; i < length; i++) {
    crc ^= (uint16_t)data[i] << 8;
    for (uint8_t bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return crc;
}
void receiveSerial() {
  // Also called between OLED I2C transfers: keep the UART's 64-byte buffer drained.
  // Commands are applied only in loop(), never recursively from the OLED callback.
  if (pendingCommand) return;
  if (rxCount && (uint32_t)(millis() - lastRx) > 250) rxCount = 0;
  while (Serial.available() && !pendingCommand) {
    rx[rxCount++] = Serial.read(); lastRx = millis();
    while (rxCount >= 3 && (rx[0] != 0x4d || rx[1] != 0x58 || rx[2] != 2)) {
      memmove(rx, rx + 1, --rxCount);
    }
    if (rxCount == 66) {
      if (crc16(rx, 64) == ((uint16_t)rx[64] | ((uint16_t)rx[65] << 8))) pendingCommand = true;
      else memmove(rx, rx + 1, --rxCount);
    }
  }
}
void sendPacket() {
  uint16_t checksum = crc16(tx, 64);
  Serial.write(tx, 64); Serial.write((uint8_t)checksum); Serial.write((uint8_t)(checksum >> 8));
  receiveSerial();
}
uint8_t boundedOledI2c(u8x8_t *display, uint8_t msg, uint8_t count, void *data) {
  receiveSerial();
  if (!oledOnline) return 0;
  uint8_t result = u8x8_byte_arduino_hw_i2c(display, msg, count, data);
  if (Wire.getWireTimeoutFlag()) oledOnline = false;
  receiveSerial();
  return result;
}
void beginOled() {
  Wire.begin(); Wire.setClock(400000); Wire.setWireTimeout(5000, true);
  for (uint8_t address = 0x3c; address <= 0x3d; address++) {
    Wire.clearWireTimeoutFlag(); Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0 && !Wire.getWireTimeoutFlag()) {
      oledAddress = address; oledOnline = true; oled.setI2CAddress(address << 1);
      oled.getU8x8()->byte_cb = boundedOledI2c; oled.begin(); oled.setContrast(180); return;
    }
  }
}
void drawIcon(uint8_t channel, uint8_t x, uint8_t y) { oled.drawXBM(x, y, 16, 16, icons[channel]); }
void drawScreen() {
  if (!oledOnline) return;
  oled.firstPage();
  do {
    oled.setFont(u8g2_font_5x7_tf);
    for (uint8_t i = 0; i < 4; i++) {
      if (layout == 0) {
        uint8_t x = i * 32; drawIcon(i, x + 8, 2); oled.drawFrame(x + 11, 23, 9, 26);
        uint8_t h = (uint16_t)levels[i] * 23 / 100;
        if (h) oled.drawBox(x + 13, 48 - h, 5, h);
        oled.setCursor(x + 5, 62); oled.print(levels[i]); oled.print('%');
      } else if (layout == 1) {
        uint8_t y = i * 16; drawIcon(i, 0, y); oled.drawFrame(23, y + 4, 75, 8);
        uint8_t w = (uint16_t)levels[i] * 71 / 100;
        if (w) oled.drawBox(25, y + 6, w, 4);
        oled.setCursor(104, y + 11); oled.print(levels[i]);
      }
    }
    if (layout == 2) {
      drawIcon(active, 8, 10); oled.setFont(u8g2_font_logisoso20_tn);
      oled.setCursor(42, 29); oled.print(levels[active]); oled.setFont(u8g2_font_5x7_tf); oled.drawStr(104, 27, "%");
      uint8_t w = (uint16_t)levels[active] * 112 / 100;
      if (w) oled.drawBox(8, 36, w, 3);
      for (uint8_t i = 0; i < 4; i++) { oled.setCursor(i * 32 + 2, 59); oled.print(i + 1); oled.print(':'); oled.print(levels[i]); }
    }
    receiveSerial();
  } while (oled.nextPage());
}
uint16_t readPot(uint8_t pin) {
  analogRead(pin); // Discard the first conversion after changing the ADC channel.
  uint16_t sum = 0;
  for (uint8_t n = 0; n < 4; n++) sum += analogRead(pin);
  return (sum + 2) / 4;
}
uint8_t percent(uint16_t value) { return ((uint32_t)value * 100 + 511) / 1023; }
void setup() {
  Serial.begin(115200); analogReference(DEFAULT);
  for (uint8_t i = 0; i < 4; i++) {
    pinMode(POT_PINS[i], INPUT); digitalWrite(POT_PINS[i], LOW);
    raw[i] = accepted[i] = readPot(POT_PINS[i]); filtered[i] = raw[i] << 4;
    physical[i] = levels[i] = percent(raw[i]);
  }
  beginOled();
}
void applyCommand() {
  if (!pendingCommand) return;
  bool valid = true;
  switch (rx[3]) {
    case 1: if (rx[4] < 3) layout = rx[4]; else valid = false; break;
    case 2: if (rx[4] < 4) memcpy(icons[rx[4]], rx + 5, 32); else valid = false; break;
    case 3:
      for (uint8_t i = 0; i < 4; i++) if (rx[4 + i] > 100) valid = false;
      if (valid) for (uint8_t i = 0; i < 4; i++) levels[i] = rx[4 + i];
      break;
    case 4: if (oledOnline) oled.setContrast(rx[4]); break;
    default: valid = false;
  }
  if (valid) {
    dirty = true; memset(tx, 0, sizeof(tx)); tx[0] = 0x4d; tx[1] = 0x58; tx[2] = 2;
    tx[3] = 0x11; tx[4] = rx[3]; tx[5] = rx[63]; sendPacket();
  }
  rxCount = 0; pendingCommand = false;
}
void loop() {
  receiveSerial(); applyCommand();
  uint32_t now = millis();
  if ((uint32_t)(now - lastSample) >= 10) {
    lastSample = now;
    for (uint8_t i = 0; i < 4; i++) {
      raw[i] = readPot(POT_PINS[i]);
      filtered[i] = (filtered[i] * 3UL + ((uint32_t)raw[i] << 4) + 2) / 4;
      uint16_t value = (filtered[i] + 8) >> 4;
      uint8_t volume = percent(value);
      if ((abs((int)value - (int)accepted[i]) >= 8 && volume != physical[i]) ||
          (volume == 0 && physical[i] != 0) || (volume == 100 && physical[i] != 100)) {
        accepted[i] = value; physical[i] = levels[i] = volume;
        active = i; pendingChanges |= 1 << i; dirty = true;
      }
      receiveSerial();
    }
  }
  if ((pendingChanges && (uint32_t)(now - lastSend) >= 20) || (uint32_t)(now - lastSend) >= 1000) {
    memset(tx, 0, sizeof(tx)); tx[0] = 0x4d; tx[1] = 0x58; tx[2] = 2; tx[3] = 0x10;
    for (uint8_t i = 0; i < 4; i++) {
      tx[4 + i] = physical[i]; tx[14 + i * 2] = raw[i]; tx[15 + i * 2] = raw[i] >> 8;
    }
    tx[8] = pendingChanges; tx[9] = 0xa1; tx[10] = 2; tx[11] = 0;
    tx[12] = oledOnline ? oledAddress : 0; tx[13] = 1;
    sendPacket(); pendingChanges = 0; lastSend = now;
  }
  if (dirty && (uint32_t)(now - lastPaint) >= 80) { drawScreen(); lastPaint = millis(); dirty = false; }
}

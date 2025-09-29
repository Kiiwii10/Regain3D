export enum IpcChannels {
  // Window management
  WINDOW_RESIZE = 'window:resize',
  // Device management
  DEVICE_DISCOVERY_START = 'device:discovery:start',
  DEVICE_DISCOVERY_STOP = 'device:discovery:stop',
  DEVICE_FOUND = 'device:found',
  DEVICE_LOST = 'device:lost',

  // Printers
  PRINTER_ADD = 'printer:add',
  PRINTER_VALIDATE = 'printer:validate',
  PRINTER_CHECK_NAME = 'printer:checkName',
  PRINTER_GET_CONFIG_SCHEMA = 'printer:getConfigSchema',
  PRINTER_GET_ALL = 'printer:getAll',
  PRINTER_GET = 'printer:get',
  PRINTER_UPDATE = 'printer:update',
  PRINTER_REMOVE = 'printer:remove',
  PRINTER_GET_BRANDS_AND_MODELS = 'printer:getBrandsAndModels',
  PRINTER_COMMAND = 'printer:command',
  PRINTER_GET_TELEMETRY = 'printer:getTelemetry',
  PRINTER_CONFIGS_CHANGED = 'printer:configs:changed',
  PRINTER_CONNECT_ALL = 'printer:connectAll',
  PRINTER_CONNECT = 'printer:connect',

  // ESP Controllers
  ESP_DISCOVERY_START = 'esp:discovery:start',
  ESP_DISCOVERY_STOP = 'esp:discovery:stop',
  ESP_FOUND = 'esp:found',
  ESP_LOST = 'esp:lost',
  ESP_GET_ALL = 'esp:getAll',
  ESP_GET = 'esp:get',
  ESP_GET_BY_IP = 'esp:getByIP',
  ESP_ADD = 'esp:add',
  ESP_UPDATE = 'esp:update',
  ESP_REMOVE = 'esp:remove',
  ESP_PROVISION = 'esp:provision',
  ESP_CHECK_REACHABLE = 'esp:checkReachable',
  ESP_GET_STATUS = 'esp:getStatus',
  ESP_IDENTIFY = 'esp:identify',
  ESP_ASSIGN_TO_PRINTER = 'esp:assignToPrinter',
  ESP_UNASSIGN = 'esp:unassign',
  ESP_ASSIGN_PROGRESS = 'esp:assign:progress',
  ESP_ASSIGN_RESULT = 'esp:assign:result',
  ESP_CONFIGS_CHANGED = 'esp:configs:changed',
  ESP_STATUS_UPDATE = 'esp:status:update',

  // Firmware hosting
  FIRMWARE_GET_FOR_PRINTER = 'firmware:getForPrinter',

  // G-code processing
  GCODE_ANALYZE = 'gcode:analyze',
  GCODE_PROCESS_FILE = 'gcode:process-file',
  GCODE_PROCESS_STRING = 'gcode:process-string',
  GCODE_GET_PROFILES = 'gcode:get-profiles',
  GCODE_VALIDATE = 'gcode:validate',
  GCODE_BATCH_PROCESS = 'gcode:batch-process'
}

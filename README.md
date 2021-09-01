
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Homebridge DMX Light Plugin

This is a Homebridge platform plugin that controls DMX-based lighting control systems. It supports the following lighting control systems:

- Enttec Pro USB Compatible controllers such as the Enttec Pro or HolidayCoro Acti-Dongle.
- Streaming ACN (E131) controllers such as the HolidayCoro Flex and Alpha Pix.

## Installation

Installation is done from within Homebridge. Search for "DMX Light" plugins within Homebridge

## Configuring Accessories

In order to configure accessories (i.e., lights, light strands, etc.) you need to make changes in two places.

1. <b>Plugin Settings UI</b>
    
    a. In Homebridge, click on the 'Plugins' tab at the top of the screen
    
    b. Locate the 'DMX Light' plugin and choose 'Settings'

    c. If you are using a Streaming ACN (E131) lighting controller then specify the IP Address of the controller.

    d. If you are using an Enttec Pro USB compatible controller then specify the serial port name where the Enttec Pro is connected to. The device MUST be connected to the same computer running Homebridge. To identify the USB port on a Raspberry Pi, at a command prompt enter `ls /dev/` and then look for something named similar to 'ttyUSB0'. Enter the full path in the text box. It should look like "/dev/ttyUSB0".

    NOTE: If you are not using the IP Address or Serial Port configuration then leave the field black. An error may occur if you specify a value that is invalid.

2. <b>Config UI</b>

    a. In Homebridge, click on the 'Config' tab at the top of the screen

    b. Locate the platform with a name of "DMX Light"

    c. Modify the JSON to include an "accessories" section similar to the following:

    ```
            {
            "name": "DMX Light",
            "ipAddress": "192.168.1.73",
            "serialPortName": "/dev/ttyUSB0",
            "platform": "DMXLightHomebridgePlugin",
            "accessories": [
                {
                    "name": "Garage Left Flood",
                    "id": "GLF",
                    "driverName": "enttec-usb-dmx-pro",
                    "dmxStartChannel": 1,
                    "dmxChannelCount": 1,
                    "dmxUniverse": 1
                },
                {
                    "name": "House Outline",
                    "id": "HO",
                    "driverName": "sacn",
                    "dmxStartChannel": 1,
                    "dmxChannelCount": 100,
                    "dmxUniverse": 130
                }
            ]
        }
    ```

    d. See below for a detailed description on what each field means

## Accessory Field Description

- name: A friendly name describing the item. This will be the default name that appears in the Home app.

- id: A unique identifier used to differentiate the accessories from one another. You can specify whatever you want as long as each accessory has a different id.

- driverName: Specify the name of the driver used to the control the item. Supported options are:

    - sacn: Used for Streaming ACN (E131) devices such as the HolidayCoro Flex or AlphaPix controllers.
    - enttec-usb-dmx-pro: Used for devices controlled by an Enttec Pro compatible device such as the Enttec Pro or Holiday Coro ActiDongle.

- dmxUniverse: The universe number configured for your lights. This should be an integer from 1-512.

- dmxStartChannel: The first channel associated within the universe.

- dmxChannelCount: The number of channels within the universe to control. For a single light, specify 1. If you are controlling a light strand with 100 lights then specify 100.


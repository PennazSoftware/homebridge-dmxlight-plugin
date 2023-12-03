
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Homebridge DMX Light Plugin

This is a Homebridge platform plugin that controls DMX-based lighting control systems. The following lighting control systems have been confirmed to work but you should have luck with any sACN device:

- Enttec Pro USB Compatible controllers such as the Enttec Pro or HolidayCoro Acti-Dongle.
- Streaming ACN (E131) controllers such as the HolidayCoro Flex, Alpha Pix, Chauvet DMX-AN2, etc.

## Installation

Installation is done from within Homebridge. Search for "DMX Light" plugins within Homebridge

## Configuring Accessories

In order to configure accessories (i.e., lights, light strands, etc.) you need to make changes in two places.

1. <b>Plugin Settings UI</b>
    
    a. In Homebridge, click on the 'Plugins' tab at the top of the screen
    
    b. Locate the 'DMX Light' plugin and choose 'Settings'

2. <b>Config UI</b>

    a. In Homebridge, click on the 'Config' tab at the top of the screen

    b. Locate the platform with a name of "DMX Light"

    c. Modify the JSON to include an "accessories" section similar to the following:

    ```
            {
            "name": "DMX Light",
            "platform": "DMXLightHomebridgePlugin",
            "accessories": [
                {
                    "name": "Garage Left Flood",
                    "id": "GLF",
                    "driverName": "enttec-usb-dmx-pro",
                    "serialPortName": "/dev/ttyUSB0",
                    "dmxStartChannel": 1,
                    "dmxChannelCount": 1,
                    "dmxUniverse": 1,
                    "colorOrder": "w"
                },
                {
                    "name": "House Outline",
                    "id": "HO",
                    "driverName": "sacn",
                    "ipAddress": "192.168.1.73",
                    "dmxStartChannel": 1,
                    "dmxChannelCount": 100,
                    "dmxUniverse": 130,
                    "colorOrder": "bgr",
                    "transitionEffect": "gradient",
                    "transitionDuration": 3000
                },
                {
                    "name": "Single White Lights",
                    "id": "SWL",
                    "driverName": "sacn",
                    "ipAddress": "192.168.1.101",
                    "dmxStartChannel": 1,
                    "dmxChannelCount": 100,
                    "dmxUniverse": 122,
                    "colorOrder": "w",
                    "transitionEffect": "",
                    "transitionDuration": 0
                }
            ]
        }
    ```

    d. See below for a detailed description on what each field means

    **BREAKING CHANGE**: Note that versions 1.1.16 and older used a global IP Address and Serial Port configuration. Newer versions now contain this information within the configuration for each accessory. You will need to move this information if you are upgrading from version 1.1.16 or prior.

## Accessory Field Description

- **name**: A friendly name describing the item. This will be the default name that appears in the Home app.

- **id**: A unique identifier used to differentiate the accessories from one another. You can specify whatever you want as long as each accessory has a different id.

- **driverName**: Specify the name of the driver used to the control the item. Supported options are:

    - **sacn**: Used for Streaming ACN (E131) devices such as the HolidayCoro Flex or AlphaPix controllers.
    - **enttec-usb-dmx-pro**: Used for devices controlled by an Enttec Pro compatible device such as the Enttec Pro or Holiday Coro ActiDongle.

- **dmxUniverse**: The universe number configured for your lights. This should be an integer from 1-512.

- **dmxStartChannel**: The first channel associated within the universe.

- **dmxChannelCount**: The number of channels within the universe to control. For a single light, specify 1. If you are controlling a light strand with 100 lights then specify 100.

- **colorOrder**: The order of RGB colors. Normally, lights are ordered in RGB (red, green and then blue). If the lights are in a different order then specify their order here. If not specified, the default is 'rgb'. If the lights do not support an RGB configuration (i.e., a single channel for brightness) then specify "w" for the color order.

- **ipAddress**: If you are using a sACN (E131) lighting controller then specify the IP Address of the controller.

- **transitionEffect**: Specify an optional transition effect to be applied when lights are turned on or off. Transitions DO NOT apply when making color changes. Transition effects are only supported for sACN devices. If 'colorOrder' is set to "w" then only the Gradient effect will work properly, for brightness. The other transitions will give unpredictable results, as they require three-channel fixtures. Supported Effects:

    - **None** or **'blank'**: Do not use any transition effect

    - **Gradient**: Changes from the current color/brightness to the desired color/brightness by utilizing a uniform "fade" transition.

    - **Chase**: Sets the new color one light at a time, beginning with the first light and transitioning in a linear fashion.

    - **Random**: Sets the new color one light at a time in a random order.

- **transitionDuration**: The duration of time (in milliseconds) to apply a transition effect. Applies only when a transition effect is used. Specify 0 for no transition. Note that if you specify too short of a duration then it may negatively impact the appearance of the effect.

- **serialPortName**: Serial port of the device connected to the serial port on the Homebridge computer, if applicable. Applies ONLY to accessories with a driverName of 'enttec-usb-dmx-pro'. Note that as of version 1.1.17 this setting was moved from the main settings to each accessories definition as the example above shows. Note that the device MUST be connected to the same computer running Homebridge. To identify the USB port on a Raspberry Pi, at a command prompt enter `ls /dev/` and then look for something named similar to 'ttyUSB0'. Enter the full path in the text box. It should look like "/dev/ttyUSB0". 

## Revision History

### 1.1.16 (Jan 30, 2023)

  - Fixed issue where multiple accessories using the same universe were overwriting each other's commands.

### 1.2.1 (Feb 23, 2023)

  - Added gradient, chase and random transition effects when lights change colors.

  - Moved IP Address and Serial Port configuration into the definition for each accessory so that multiple devices can be supported.  This is a breaking change and will require modification of the config JSON in HomeBridge.

### 1.2.4 (Jul 22, 2023)

 - Added support for multiple sACN devices with different IP Addresses

 - Added support for single-channel lights (i.e., non-RGB) using a colorOrder of 'w'. Transition effects are not supported in this configuration.

 - Fix Gradient (i.e., fade-in/fade-out) transition effect that was causing lights to flicker during transition.

 ### 1.2.5 (Jul 30, 2023)

 - Added Enttec Pro support for single-channel lights (i.e., non-RGB) using a colorOrder of 'w'. Transition effects are not supported in this configuration.

 ### 1.2.7 (Dec 03, 2023)

 - Fix Gradient transition to work with single-channel sACN fixtures.

 - Add proper handling of colorOrder = 'w' in platform.ts.
 
 - Fix Gradient "FadeIn" transition to fade to new setting from current setting instead of 0,0,0

 - Still need to fix individual fixture control when multiple fixtures are defined in the same universe.

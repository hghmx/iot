var snmpDevice = require('./SNMPDevice');
var deviceInst = {
    "setOIDs": "[{\"oid\":\".1.3.6.1.2.1.1.6.0\", \"type\":\"OctetString\", \"value\":\"Irvine CA\"}]",
    "trapsPort": 162,
    "_lastmodified": 1446050859600,
    "guestusers": [],
    "snmpPort": 161,
    "location": "{\"wkt\":\"POINT(-117.72047996520998 33.70534863057765)\",\"sContext\":\"geo\",\"hash\":\"9mur9pyecurupyxgrgrupezz\"}",
    "@type": "/amtech/linkeddata/types/composite/entity/SNMPDevice",
    "_resourcestatus": "valid",
    "svgicon": "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\r\n<!-- Generator: Adobe Illustrator 16.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->\r\n<!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">\r\n<svg version=\"1.1\" id=\"Capa_1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" x=\"0px\" y=\"0px\"\r\n\t width=\"437.63px\" height=\"437.63px\" viewBox=\"0 0 437.63 437.63\" style=\"enable-background:new 0 0 437.63 437.63;\"\r\n\t xml:space=\"preserve\">\r\n<g>\r\n\t<g>\r\n\t\t<path d=\"M388.947,297.353H8.681c-4.794,0-8.681,3.887-8.681,8.682v88.73c0,4.795,3.887,8.682,8.681,8.682h380.266\r\n\t\t\tc4.795,0,8.682-3.887,8.682-8.682v-88.73C397.629,301.24,393.742,297.353,388.947,297.353z M103.773,370.766H63.041\r\n\t\t\tc-11.249,0-20.366-9.119-20.366-20.366c0-11.248,9.118-20.366,20.366-20.366h40.732c11.247,0,20.366,9.118,20.366,20.366\r\n\t\t\tC124.139,361.647,115.02,370.766,103.773,370.766z M219.181,370.766h-40.732c-11.248,0-20.366-9.119-20.366-20.366\r\n\t\t\tc0-11.248,9.118-20.366,20.366-20.366h40.732c11.248,0,20.366,9.118,20.366,20.366\r\n\t\t\tC239.547,361.647,230.428,370.766,219.181,370.766z M334.59,370.766h-40.732c-11.25,0-20.367-9.119-20.367-20.366\r\n\t\t\tc0-11.248,9.119-20.366,20.367-20.366h40.732c11.246,0,20.365,9.118,20.365,20.366\r\n\t\t\tC354.955,361.647,345.836,370.766,334.59,370.766z\"/>\r\n\t\t<path d=\"M341.99,148.919v130.304h27.938V148.919c0-7.714-6.254-13.968-13.969-13.968\r\n\t\t\tC348.246,134.951,341.99,141.205,341.99,148.919z\"/>\r\n\t\t<path d=\"M387.699,115.99c2.662,0,5.324-1.018,7.352-3.052c4.045-4.061,4.033-10.631-0.025-14.677\r\n\t\t\tc-10.447-10.41-24.322-16.144-39.068-16.144s-28.619,5.733-39.066,16.144c-4.061,4.046-4.07,10.616-0.025,14.677\r\n\t\t\tc4.045,4.06,10.617,4.07,14.676,0.025c6.531-6.507,15.201-10.091,24.418-10.091s17.887,3.584,24.416,10.091\r\n\t\t\tC382.4,114.982,385.051,115.99,387.699,115.99z\"/>\r\n\t\t<path d=\"M434.584,66.716c-21.012-20.979-48.934-32.533-78.625-32.533c-29.689,0-57.613,11.554-78.627,32.533\r\n\t\t\tc-4.055,4.05-4.061,10.62-0.01,14.677c4.049,4.056,10.621,4.061,14.676,0.011c17.094-17.066,39.809-26.465,63.961-26.465\r\n\t\t\ts46.867,9.398,63.961,26.465c2.025,2.023,4.68,3.034,7.332,3.034c2.658,0,5.316-1.016,7.344-3.045\r\n\t\t\tC438.646,77.336,438.641,70.766,434.584,66.716z\"/>\r\n\t</g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n<g>\r\n</g>\r\n</svg>\r\n",
    "_name": "snmpClientM2mBridge",
    "getOIDs": "[{\"name\":\"memoryTotal\", \"oid\":\".1.3.6.1.4.1.2021.4.5.0\"},  {\"name\":\"memoryAvailable\", \"oid\":\".1.3.6.1.4.1.2021.4.6.0\"},  {\"name\":\"memoryBuffers\", \"oid\":\".1.3.6.1.4.1.2021.4.14.0\"}, {\"name\":\"memoryCached\", \"oid\":\".1.3.6.1.4.1.2021.4.15.0\"}, {\"name\":\"PercentageSpaceUsedDisk\", \"oid\":\".1.3.6.1.4.1.2021.9.1.9.1\"}, {\"name\":\"cpuRawUser\", \"oid\" : \".1.3.6.1.4.1.2021.11.50.0\"}, {\"name\":\"cpuRawNice\", \"oid\" : \".1.3.6.1.4.1.2021.11.51.0\"}, {\"name\":\"cpuRawSystem\", \"oid\" : \".1.3.6.1.4.1.2021.11.52.0\"}, {\"name\":\"cpuRawIdle\", \"oid\" : \".1.3.6.1.4.1.2021.11.53.0\"}, {\"name\":\"cpuRawWait\", \"oid\" : \".1.3.6.1.4.1.2021.11.54.0\"}, {\"name\":\"cpuRawKernel\", \"oid\" : \".1.3.6.1.4.1.2021.11.55.0\"}]",
    "ipaddress": "localhost",
    "communityString": "private",
    "emaillist": "",
    "creationDate": "2015-10-27T23:57:19.382Z",
    "readFrequency": "PT15M",
    "description": "An SNMPDevice instance acting as SNMP manager/client proxying snmp commands (get/set/trups) to manager a ubuntu box hosting m2mbridge",
    "guesttenants": [],
    "phonelist": "",
    "@id": "/amtech/things/entities/snmpClientM2mBridge",
    "snmpVersion": "2c",
    "_user": "carlos@amtech.mx"
};

var s = new snmpDevice.SNMPDevice( );

s.start({}, null,deviceInst, function(err){
    var e = err;
//    s.stop( function(err){
//        e = err;
//    });
});
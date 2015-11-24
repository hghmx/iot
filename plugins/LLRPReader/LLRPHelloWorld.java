/*
 *  LLRPHelloWorld.java
 *  Created:	May 26, 2008
 *  Author:    Kyle Neumeier - kyle@pramari.com
 */


import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.Socket;
import java.util.ArrayList;
import java.util.concurrent.LinkedBlockingQueue;

import org.apache.log4j.Logger;
import org.llrp.ltk.exceptions.InvalidLLRPMessageException;
import org.llrp.ltk.generated.enumerations.AISpecStopTriggerType;
import org.llrp.ltk.generated.enumerations.AccessReportTriggerType;
import org.llrp.ltk.generated.enumerations.AirProtocols;
import org.llrp.ltk.generated.enumerations.GetReaderCapabilitiesRequestedData;
import org.llrp.ltk.generated.enumerations.NotificationEventType;
import org.llrp.ltk.generated.enumerations.ROReportTriggerType;
import org.llrp.ltk.generated.enumerations.ROSpecStartTriggerType;
import org.llrp.ltk.generated.enumerations.ROSpecState;
import org.llrp.ltk.generated.enumerations.ROSpecStopTriggerType;
import org.llrp.ltk.generated.messages.ADD_ROSPEC;
import org.llrp.ltk.generated.messages.CLOSE_CONNECTION;
import org.llrp.ltk.generated.messages.DELETE_ROSPEC;
import org.llrp.ltk.generated.messages.DISABLE_ROSPEC;
import org.llrp.ltk.generated.messages.ENABLE_ROSPEC;
import org.llrp.ltk.generated.messages.GET_READER_CAPABILITIES;
import org.llrp.ltk.generated.messages.LLRPMessageFactory;
import org.llrp.ltk.generated.messages.READER_EVENT_NOTIFICATION;
import org.llrp.ltk.generated.messages.SET_READER_CONFIG;
import org.llrp.ltk.generated.messages.START_ROSPEC;
import org.llrp.ltk.generated.messages.STOP_ROSPEC;
import org.llrp.ltk.generated.parameters.AISpec;
import org.llrp.ltk.generated.parameters.AISpecStopTrigger;
import org.llrp.ltk.generated.parameters.AccessReportSpec;
import org.llrp.ltk.generated.parameters.C1G2EPCMemorySelector;
import org.llrp.ltk.generated.parameters.EventNotificationState;
import org.llrp.ltk.generated.parameters.InventoryParameterSpec;
import org.llrp.ltk.generated.parameters.ROBoundarySpec;
import org.llrp.ltk.generated.parameters.ROReportSpec;
import org.llrp.ltk.generated.parameters.ROSpec;
import org.llrp.ltk.generated.parameters.ROSpecStartTrigger;
import org.llrp.ltk.generated.parameters.ROSpecStopTrigger;
import org.llrp.ltk.generated.parameters.ReaderEventNotificationData;
import org.llrp.ltk.generated.parameters.ReaderEventNotificationSpec;
import org.llrp.ltk.generated.parameters.TagReportContentSelector;
import org.llrp.ltk.types.Bit;
import org.llrp.ltk.types.LLRPInteger;
import org.llrp.ltk.types.LLRPMessage;
import org.llrp.ltk.types.UnsignedInteger;
import org.llrp.ltk.types.UnsignedShort;
import org.llrp.ltk.types.UnsignedShortArray;

/**
 * This program demonstrates how to create a simple LLRP client using the Java
 * LLRP Toolkit (llrp.org). It creates a connection to the reader, sets up a
 * ROSpec, and gets tag reads back.
 * 
 * @author Kyle Neumeier - kyle@pramari.com
 * @author Andreas Huebner - andreas@pramari.com
 * 
 */
public class LLRPHelloWorld {

	/**
	 * The IP Address of the LLRP reader
	 */
	private static String ipAddress = null;

	/**
	 * The port of the LLRP reader
	 */
	private static int readerPort = -1;

	/**
	 * The socket connection with the Reader
	 */
	private Socket connection;

	/**
	 * The output stream to the reader
	 */
	private DataOutputStream out;

	/**
	 * The ID of the ROSpec that is used
	 */
	private static int ROSPEC_ID = 1;

	/**
	 * The log4j logger
	 */
	private static Logger logger;

	/**
	 * A thread that reads LLRP messages from the reader and puts them in a
	 * queue
	 */
	private ReadThread rt = null;

	/**
	 * The main method for the program
	 * 
	 * @param args
	 *            If arguments are supplied, the first argument should be the IP
	 *            address of the reader. The second argument should be the port.
	 *            If no IP/Port are given, then the default(127.0.0.1:5084) will
	 *            be used
	 */
	public static void main(String[] args) {
		logger = Logger.getLogger(LLRPHelloWorld.class);
		if (args.length != 2) {
			ipAddress = "127.0.0.1";
			readerPort = 5084;
			logger.info("No IP address and port were supplied.  Using "
					+ ipAddress + ":" + readerPort);
		} else {
			ipAddress = args[0];
			readerPort = Integer.parseInt(args[1]);
		}

		try {
			new LLRPHelloWorld();
			logger.info("LLRP Hello World has terminated");
		} catch (IOException e) {
			e.printStackTrace();
		}

	}

	/**
	 * The constructor creates a connection to the reader and sends LLRP
	 * messages. It first sends a GET_READER_CAPABILIITIES message and a
	 * SET_READER_CONFIG message. Then it creates an ROSpec with null start and
	 * stop triggers. After it enables and starts the ROSpec. It waits for a few
	 * seconds to receive tag reads before it disables and deletes the ROSpec.
	 * Finally it ends the LLRP connection.
	 * 
	 * @throws IOException
	 */
	public LLRPHelloWorld() throws IOException {
		
		// Try to establish a connection to the reader
		connection = new Socket(ipAddress, readerPort);
		out = new DataOutputStream(connection.getOutputStream());

		// Start up the ReaderThread to read messages form socket to Console
		rt = new ReadThread(connection);
		rt.start();

		// Wait for the NotificationEvent the Reader sends whenever a
		// connection attempt is made
		pause(250);
		LLRPMessage m = rt.getNextMessage();
		READER_EVENT_NOTIFICATION readerEventNotification = (READER_EVENT_NOTIFICATION) m;
		ReaderEventNotificationData red = readerEventNotification
				.getReaderEventNotificationData();
		if (red.getConnectionAttemptEvent() != null) {
			logger.info("Connection attempt was successful");
		}else{
			logger.error("Connection attempt was unsucessful");
			System.exit(-1);
		}

		// Create a GET_READER_CAPABILITIES Message and send it to the reader
		GET_READER_CAPABILITIES getReaderCap = new GET_READER_CAPABILITIES();
		getReaderCap.setRequestedData(new GetReaderCapabilitiesRequestedData(
				GetReaderCapabilitiesRequestedData.All));
		write(getReaderCap, "GET_READER_CAPABILITIES");
		pause(250);

		// Create a SET_READER_CONFIG Message and send it to the reader
		SET_READER_CONFIG setReaderConfig = createSetReaderConfig();
		write(setReaderConfig, "SET_READER_CONFIG");
		pause(250);

		//CREATE an ADD_ROSPEC Message and send it to the reader
		ADD_ROSPEC addROSpec = new ADD_ROSPEC();
		addROSpec.setROSpec(createROSpec());
		write(addROSpec, "ADD_ROSPEC");
		pause(250);

		//Create an ENABLE_ROSPEC message and send it to the reader
		ENABLE_ROSPEC enableROSpec = new ENABLE_ROSPEC();
		enableROSpec.setROSpecID(new UnsignedInteger(ROSPEC_ID));
		write(enableROSpec, "ENABLE_ROSPEC");
		pause(250);

		//Create a START_ROSPEC message and send it to the reader
		START_ROSPEC startROSpec = new START_ROSPEC();
		startROSpec.setROSpecID(new UnsignedInteger(ROSPEC_ID));
		write(startROSpec, "START_ROSPEC");

		//wait for five seconds for tag reads
		pause(5000);

		//Create a STOP_ROSPEC message and send it to the reader
		STOP_ROSPEC stopROSpec = new STOP_ROSPEC();
		stopROSpec.setROSpecID(new UnsignedInteger(ROSPEC_ID));
		write(stopROSpec, "STOP_ROSPEC");
		pause(250);

		//Create a DISABLE_ROSPEC message and send it to the reader
		DISABLE_ROSPEC disableROSpec = new DISABLE_ROSPEC();
		disableROSpec.setROSpecID(new UnsignedInteger(ROSPEC_ID));
		write(disableROSpec, "DISABLE_ROSPEC");
		pause(250);

		//Create a DELTE_ROSPEC message and send it to the reader
		DELETE_ROSPEC deleteROSpec = new DELETE_ROSPEC();
		deleteROSpec.setROSpecID(new UnsignedInteger(ROSPEC_ID));
		write(deleteROSpec, "DELETE_ROSPEC");
		pause(250);

		//wait for one second before closing the connection
		pause(1000);

		// Create a CLOSE_CONNECTION message and send it to the reader
		CLOSE_CONNECTION cc = new CLOSE_CONNECTION();
		write(cc, "CloseConnection");

		synchronized (rt) {
			try {
				logger.debug("Wait for the Reader to close the Connection");
				rt.wait();
			} catch (InterruptedException e) {
				// Quit the Program
			}
		}

	}

	/**
	 * This method creates a ROSpec with null start and stop triggers
	 * @return
	 */
	private ROSpec createROSpec() {
		
		//create a new rospec
		ROSpec roSpec = new ROSpec();
		roSpec.setPriority(new LLRPInteger(0));
		roSpec.setCurrentState(new ROSpecState(ROSpecState.Disabled));
		roSpec.setROSpecID(new UnsignedInteger(ROSPEC_ID));

		//set up ROBoundary (start and stop triggers)
		ROBoundarySpec roBoundarySpec = new ROBoundarySpec();

		ROSpecStartTrigger startTrig = new ROSpecStartTrigger();
		startTrig.setROSpecStartTriggerType(new ROSpecStartTriggerType(
				ROSpecStartTriggerType.Null));
		roBoundarySpec.setROSpecStartTrigger(startTrig);

		ROSpecStopTrigger stopTrig = new ROSpecStopTrigger();
		stopTrig.setDurationTriggerValue(new UnsignedInteger(0));
		stopTrig.setROSpecStopTriggerType(new ROSpecStopTriggerType(
				ROSpecStopTriggerType.Null));
		roBoundarySpec.setROSpecStopTrigger(stopTrig);

		roSpec.setROBoundarySpec(roBoundarySpec);

		//Add an AISpec
		AISpec aispec = new AISpec();
		
		//set AI Stop trigger to null
		AISpecStopTrigger aiStopTrigger = new AISpecStopTrigger();
		aiStopTrigger.setAISpecStopTriggerType(new AISpecStopTriggerType(
				AISpecStopTriggerType.Null));
		aiStopTrigger.setDurationTrigger(new UnsignedInteger(0));
		aispec.setAISpecStopTrigger(aiStopTrigger);

		UnsignedShortArray antennaIDs = new UnsignedShortArray();
		antennaIDs.add(new UnsignedShort(0));
		aispec.setAntennaIDs(antennaIDs);

		InventoryParameterSpec inventoryParam = new InventoryParameterSpec();
		inventoryParam.setProtocolID(new AirProtocols(
				AirProtocols.EPCGlobalClass1Gen2));
		inventoryParam.setInventoryParameterSpecID(new UnsignedShort(1));
		aispec.addToInventoryParameterSpecList(inventoryParam);

		roSpec.addToSpecParameterList(aispec);

		return roSpec;
	}

	/**
	 * This method creates a SET_READER_CONFIG method
	 * @return
	 */
	private SET_READER_CONFIG createSetReaderConfig() {
		SET_READER_CONFIG setReaderConfig = new SET_READER_CONFIG();

		// Create a default RoReportSpec so that reports are sent at the end of ROSpecs
		 
		ROReportSpec roReportSpec = new ROReportSpec();
		roReportSpec.setN(new UnsignedShort(0));
		roReportSpec.setROReportTrigger(new ROReportTriggerType(
				ROReportTriggerType.Upon_N_Tags_Or_End_Of_ROSpec));
		TagReportContentSelector tagReportContentSelector = new TagReportContentSelector();
		tagReportContentSelector.setEnableAccessSpecID(new Bit(0));
		tagReportContentSelector.setEnableAntennaID(new Bit(1));
		tagReportContentSelector.setEnableChannelIndex(new Bit(0));
		tagReportContentSelector.setEnableFirstSeenTimestamp(new Bit(0));
		tagReportContentSelector.setEnableInventoryParameterSpecID(new Bit(0));
		tagReportContentSelector.setEnableLastSeenTimestamp(new Bit(0));
		tagReportContentSelector.setEnablePeakRSSI(new Bit(0));
		tagReportContentSelector.setEnableROSpecID(new Bit(1));
		tagReportContentSelector.setEnableSpecIndex(new Bit(0));
		tagReportContentSelector.setEnableTagSeenCount(new Bit(0));
		C1G2EPCMemorySelector epcMemSel = new C1G2EPCMemorySelector();
		epcMemSel.setEnableCRC(new Bit(0));
		epcMemSel.setEnablePCBits(new Bit(0));
		tagReportContentSelector
				.addToAirProtocolEPCMemorySelectorList(epcMemSel);
		roReportSpec.setTagReportContentSelector(tagReportContentSelector);
		setReaderConfig.setROReportSpec(roReportSpec);

		//  Set default AccessReportSpec
		 
		AccessReportSpec accessReportSpec = new AccessReportSpec();
		accessReportSpec.setAccessReportTrigger(new AccessReportTriggerType(
				AccessReportTriggerType.Whenever_ROReport_Is_Generated));
		setReaderConfig.setAccessReportSpec(accessReportSpec);

		// Set up reporting for AISpec events, ROSpec events, and GPI Events
		 
		ReaderEventNotificationSpec eventNoteSpec = new ReaderEventNotificationSpec();
		EventNotificationState noteState = new EventNotificationState();
		noteState.setEventType(new NotificationEventType(
				NotificationEventType.AISpec_Event));
		noteState.setNotificationState(new Bit(1));
		eventNoteSpec.addToEventNotificationStateList(noteState);
		noteState = new EventNotificationState();
		noteState.setEventType(new NotificationEventType(
				NotificationEventType.ROSpec_Event));
		noteState.setNotificationState(new Bit(1));
		eventNoteSpec.addToEventNotificationStateList(noteState);
		noteState = new EventNotificationState();
		noteState.setEventType(new NotificationEventType(
				NotificationEventType.GPI_Event));
		noteState.setNotificationState(new Bit(1));
		eventNoteSpec.addToEventNotificationStateList(noteState);
		setReaderConfig.setReaderEventNotificationSpec(eventNoteSpec);

		setReaderConfig.setResetToFactoryDefault(new Bit(0));

		return setReaderConfig;

	}

	/**
	 * This method causes the calling thread to sleep for a specified number of milliseconds
	 * @param ms
	 */
	private void pause(long ms) {
		try {
			Thread.sleep(ms);
		} catch (InterruptedException e) {
			e.printStackTrace();
		}
	}

	/**
	 * Send a llrp message to the reader
	 * 
	 * @param msg
	 *            Message to be send
	 * @param message
	 *            Description for output purposes
	 */
	private void write(LLRPMessage msg, String message) {
		try {
			logger.info(" Sending message: \n" + msg.toXMLString());
			out.write(msg.encodeBinary());
		} catch (IOException e) {
			logger.error("Couldn't send Command ", e);
		} catch (InvalidLLRPMessageException e) {
			logger.error("Couldn't send Command", e);
		}
	}
	
	/**
	 * 
	 * This class is a allows LLRP messages to be read on a separate thread
	 * @author Kyle Neumeier
	 * @author Andreas Huebner
	 *
	 */
	class ReadThread extends Thread {
		
		/**
		 * The incoming data stream from the LLRP reader connection
		 */
		private DataInputStream inStream = null;

		/**
		 * The socket for the connection to the LLRP Reader
		 */
		private Socket socket = null;
		
		/**
		 * A queue to store incoming LLRP Messages
		 */
		private LinkedBlockingQueue<LLRPMessage> queue = null;

		/**
		 * Thread for constant reading of the stream
		 * 
		 * @param inStream
		 */
		public ReadThread(Socket socket) {
			this.socket = socket;
			this.queue = new LinkedBlockingQueue<LLRPMessage>();
			try {
				this.inStream = new DataInputStream(socket.getInputStream());
			} catch (IOException e) {
				logger.error("Cannot get input stream", e);
			}
		}

		@Override
		public void run() {
			super.run();
			if (socket.isConnected()) {
				while (!socket.isClosed()) {
					LLRPMessage message = null;
					try {
						message = read();
						if (message != null) {
							queue.put(message);
							logger.info("Received Message: \n"
									+ message.toXMLString());
						} else {
							logger.info("closing socket");
							socket.close();
						}

					} catch (IOException e) {
						logger.error("Error while reading message", e);
					} catch (InvalidLLRPMessageException e) {
						logger.error("Error while reading message", e);
					} catch (InterruptedException e) {
						logger.error("Error while reading message", e);
					}
				}
			}

		}

		/**
		 * Read everything from the stream until the socket is closed
		 * 
		 * @throws InvalidLLRPMessageException
		 */
		public LLRPMessage read() throws IOException,
				InvalidLLRPMessageException {
			LLRPMessage m = null;
			// The message header
			byte[] first = new byte[6];

			// the complete message
			byte[] msg;

			// Read in the message header. If -1 is read, there is no more
			// data available, so close the socket
			if (inStream.read(first, 0, 6) == -1) {
				return null;
			}
			int msgLength = 0;

			try {
				// calculate message length
				msgLength = calculateLLRPMessageLength(first);
			} catch (IllegalArgumentException e) {
				throw new IOException("Incorrect Message Length");
			}

			/*
			 * the rest of bytes of the message will be stored in here before
			 * they are put in the accumulator. If the message is short, all
			 * messageLength-6 bytes will be read in here at once. If it is
			 * long, the data might not be available on the socket all at once,
			 * so it make take a couple of iterations to read in all the bytes
			 */
			byte[] temp = new byte[msgLength - 6];

			// all the rest of the bytes will be put into the accumulator
			ArrayList<Byte> accumulator = new ArrayList<Byte>();

			// add the first six bytes to the accumulator so that it will
			// contain all the bytes at the end
			for (byte b : first) {
				accumulator.add(b);
			}

			// the number of bytes read on the last call to read()
			int numBytesRead = 0;

			// read from the input stream and put bytes into the accumulator
			// while there are still bytes left to read on the socket and
			// the entire message has not been read
			while (((msgLength - accumulator.size()) != 0)
					&& numBytesRead != -1) {

				numBytesRead = inStream.read(temp, 0, msgLength
						- accumulator.size());

				for (int i = 0; i < numBytesRead; i++) {
					accumulator.add(temp[i]);
				}
			}

			if ((msgLength - accumulator.size()) != 0) {
				throw new IOException("Error: Discrepency between message size"
						+ " in header and actual number of bytes read");
			}

			msg = new byte[msgLength];

			// copy all bytes in the accumulator to the msg byte array
			for (int i = 0; i < accumulator.size(); i++) {
				msg[i] = accumulator.get(i);
			}

			// turn the byte array into an LLRP Message Object
			m = LLRPMessageFactory.createLLRPMessage(msg);
			return m;
		}

		/**
		 * Send in the first 6 bytes of an LLRP Message
		 * 
		 * @param bytes
		 * @return
		 */
		private int calculateLLRPMessageLength(byte[] bytes)
				throws IllegalArgumentException {
			long msgLength = 0;
			int num1 = 0;
			int num2 = 0;
			int num3 = 0;
			int num4 = 0;

			num1 = ((unsignedByteToInt(bytes[2])));
			num1 = num1 << 32;
			if (num1 > 127) {
				throw new RuntimeException(
						"Cannot construct a message greater than "
								+ "2147483647 bytes (2^31 - 1), due to the fact that there are "
								+ "no unsigned ints in java");
			}

			num2 = ((unsignedByteToInt(bytes[3])));
			num2 = num2 << 16;

			num3 = ((unsignedByteToInt(bytes[4])));
			num3 = num3 << 8;

			num4 = (unsignedByteToInt(bytes[5]));

			msgLength = num1 + num2 + num3 + num4;

			if (msgLength < 0) {
				throw new IllegalArgumentException(
						"LLRP message length is less than 0");
			} else {
				return (int) msgLength;
			}
		}
		
		/**
		 * From http://www.rgagnon.com/javadetails/java-0026.html
		 * 
		 * @param b
		 * @return
		 */
		private int unsignedByteToInt(byte b) {
			return (int) b & 0xFF;
		}

		/**
		 * Receive the next Message
		 * 
		 * @return returns the Message form the Queue and removes it. It blocks
		 *         if there is no Message.
		 */
		public LLRPMessage getNextMessage() {
			LLRPMessage m = null;
			try {
				m = queue.take();
			} catch (InterruptedException e) {
				// nothing
			}
			return m;
		}
	}

}

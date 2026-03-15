"""
Seed comprehensive SWIFT parameters covering all MT, MX/ISO20022, BIC, and other categories.
Based on SWIFT Standards 2025 and ISO 20022 migration requirements.
"""
from django.core.management.base import BaseCommand
from apps.transformation.models import SwiftParameter

# fmt: off
PARAMS = [
    # ═══════════════════════════════════════════════════════════════
    # MT103 — Single Customer Credit Transfer
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT103',':20:','Transaction Reference','Sender assigned reference to identify the transaction','REFERENCE',True,16,'16x','REF20250315001'),
    ('MT','MT103',':13C:','Time Indication','Time with UTC offset indicating processing deadlines','DATETIME',False,28,'/8c/4!n1!x4!n',''),
    ('MT','MT103',':23B:','Bank Operation Code','Type of operation: CRED, CRTS, SPAY, SPRI, SSTD','CODE',True,4,'4!c','CRED'),
    ('MT','MT103',':23E:','Instruction Code','Additional instruction: CHQB, CORT, HOLD, INTC, PHOB, PHOI, PHON, SDVA, TELB, TELE, TELI','CODE',False,30,'4!c[/30x]','SDVA'),
    ('MT','MT103',':26T:','Transaction Type Code','3-char code identifying the nature of the transaction','CODE',False,3,'3!c','K90'),
    ('MT','MT103',':32A:','Value Date/Currency/Amount','Settlement date, currency code (ISO 4217), and interbank settled amount','AMOUNT',True,24,'6!n3!a15d','250315USD1000000,50'),
    ('MT','MT103',':33B:','Currency/Instructed Amount','Original ordered amount in currency specified by ordering customer','AMOUNT',False,18,'3!a15d','USD1000000,50'),
    ('MT','MT103',':36:','Exchange Rate','Rate of exchange applied between instructed and settlement currencies','RATE',False,12,'12d','1,08975'),
    ('MT','MT103',':50A:','Ordering Customer (BIC)','Payer identified by account and BIC code','BIC',False,None,'[/34x]CRLF4!a2!a2!c[3!c]',''),
    ('MT','MT103',':50F:','Ordering Customer (Party)','Structured party identification with name, address, country, DOB, city','TEXT',False,None,'35x',''),
    ('MT','MT103',':50K:','Ordering Customer (Name/Addr)','Payer identified by account, name & address (4 lines max)','TEXT',True,None,'[/34x]CRLF4*35x','/GB82WEST12345698765432\nJOHN DOE\n123 MAIN STREET\nLONDON GB'),
    ('MT','MT103',':52A:','Ordering Institution','Sending bank identified by BIC','BIC',False,None,'[/1!a][/34x]CRLF4!a2!a2!c[3!c]','DEUTDEFF'),
    ('MT','MT103',':53A:','Sender Correspondent','Correspondent through which sender will reimburse receiver','BIC',False,None,'[/1!a][/34x]CRLF4!a2!a2!c[3!c]','CHASUS33'),
    ('MT','MT103',':54A:','Receiver Correspondent','Correspondent of the receiver institution','BIC',False,None,'[/1!a][/34x]CRLF4!a2!a2!c[3!c]',''),
    ('MT','MT103',':55A:','Third Reimbursement Institution','Financial institution for reimbursement','BIC',False,None,'',''),
    ('MT','MT103',':56A:','Intermediary Institution','Mid-chain bank routing the payment','BIC',False,None,'[/1!a][/34x]CRLF4!a2!a2!c[3!c]','IRVTUS3N'),
    ('MT','MT103',':57A:','Account With Institution','Beneficiary bank servicing the beneficiary account','BIC',False,None,'[/1!a][/34x]CRLF4!a2!a2!c[3!c]','BNPAFRPP'),
    ('MT','MT103',':59:','Beneficiary Customer','Recipient account and name/address','TEXT',True,None,'[/34x]CRLF4*35x','/FR7630006000011234567890189\nACME CORPORATION\nPARIS FR'),
    ('MT','MT103',':59A:','Beneficiary Customer (BIC)','Recipient identified by BIC','BIC',False,None,'[/34x]CRLF4!a2!a2!c[3!c]',''),
    ('MT','MT103',':70:','Remittance Information','Payment reference, invoice numbers, PO numbers','TEXT',False,140,'4*35x','INV-2025-00123 PO-456'),
    ('MT','MT103',':71A:','Details of Charges','Who pays charges: BEN, OUR, SHA','CODE',True,3,'3!a','SHA'),
    ('MT','MT103',':71F:','Sender Charges','Currency and amount of charges deducted by sender','AMOUNT',False,18,'3!a15d','USD15,00'),
    ('MT','MT103',':71G:','Receiver Charges','Currency and amount of charges to be collected by receiver','AMOUNT',False,18,'3!a15d',''),
    ('MT','MT103',':72:','Sender to Receiver Info','Additional info for the receiving bank (codes like /ACC/, /INS/, /INT/)','NARRATIVE',False,210,'6*35x','/ACC/ADDITIONAL INFO'),
    ('MT','MT103',':77B:','Regulatory Reporting','Regulatory/statutory info required for the transaction','TEXT',False,105,'3*35x','/ORDERRES/GB//TAX ID 12345'),
    ('MT','MT103',':77T:','Envelope Contents','SWIFT gpi envelope – uetr and tracking info','TEXT',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT202 — Financial Institution Transfer
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT202',':20:','Transaction Reference','Sender reference for the interbank transfer','REFERENCE',True,16,'16x','202REF20250315'),
    ('MT','MT202',':21:','Related Reference','Reference to the related transaction or MT103','REFERENCE',True,16,'16x','103REF20250315'),
    ('MT','MT202',':13C:','Time Indication','Processing time with UTC offset','DATETIME',False,28,'/8c/4!n1!x4!n',''),
    ('MT','MT202',':32A:','Value Date/Currency/Amount','Settlement date, currency, and amount','AMOUNT',True,24,'6!n3!a15d','250315USD500000,'),
    ('MT','MT202',':52A:','Ordering Institution','Bank originating the transfer','BIC',False,None,'','DEUTDEFF'),
    ('MT','MT202',':53A:','Sender Correspondent','Sender reimbursement correspondent','BIC',False,None,'',''),
    ('MT','MT202',':54A:','Receiver Correspondent','Receiver reimbursement correspondent','BIC',False,None,'',''),
    ('MT','MT202',':56A:','Intermediary Institution','Intermediary bank in the chain','BIC',False,None,'',''),
    ('MT','MT202',':57A:','Account With Institution','Bank where funds will be credited','BIC',False,None,'','BNPAFRPP'),
    ('MT','MT202',':58A:','Beneficiary Institution','Final receiving financial institution','BIC',True,None,'[/1!a][/34x]CRLF4!a2!a2!c[3!c]','COBADEFF'),
    ('MT','MT202',':72:','Sender to Receiver Info','Additional instructions or info','NARRATIVE',False,210,'6*35x',''),
    # ═══════════════════════════════════════════════════════════════
    # MT300 — Foreign Exchange Confirmation
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT300',':20:','Sender Reference','Reference assigned by the sender','REFERENCE',True,16,'16x','FX20250315001'),
    ('MT','MT300',':21:','Related Reference','Reference to the deal or common reference','REFERENCE',False,16,'',''),
    ('MT','MT300',':22A:','Type of Operation','AMND, CANC, DUPL, NEWT','CODE',True,4,'4!c','NEWT'),
    ('MT','MT300',':22C:','Common Reference','Common reference for both parties to the deal','TEXT',True,24,'',''),
    ('MT','MT300',':30T:','Trade Date','Date of the trade','DATE',True,8,'8!n','20250315'),
    ('MT','MT300',':30V:','Value Date','Settlement date','DATE',True,8,'8!n','20250317'),
    ('MT','MT300',':32B:','Currency/Amount (Bought)','Currency and amount bought','AMOUNT',True,18,'3!a15d','USD1000000,'),
    ('MT','MT300',':33B:','Currency/Amount (Sold)','Currency and amount sold','AMOUNT',True,18,'3!a15d','EUR920000,'),
    ('MT','MT300',':36:','Exchange Rate','Agreed exchange rate','RATE',True,12,'12d','1,08696'),
    # ═══════════════════════════════════════════════════════════════
    # MT540 — Receive Free (Securities)
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT540',':16R:','Start of Block','Block delimiter for structured sequences (GENL, TRADE, FIAC, SETDET)','CODE',True,16,'16x','GENL'),
    ('MT','MT540',':16S:','End of Block','End of structured sequence block','CODE',True,16,'16x','GENL'),
    ('MT','MT540',':20C:','Reference','SEME (Sender Ref), POOL, RELA (Related Ref), TRRF (Trade Ref)','REFERENCE',True,16,':4!c//16x',':SEME//RF540001'),
    ('MT','MT540',':23G:','Function of Message','NEWM, CANC, PREA, RVSL','CODE',True,4,'4!c','NEWM'),
    ('MT','MT540',':22F:','Indicator','Settlement transaction type, conditions, stamp duty','CODE',False,None,':4!c//4!c',':SETR//TRAD'),
    ('MT','MT540',':98A:','Date','Trade date, settlement date, preparation date','DATE',True,8,':4!c//8!n',':SETT//20250317'),
    ('MT','MT540',':98C:','Date/Time','Date and time with optional UTC','DATETIME',False,None,':4!c//8!n6!n',':PREP//20250315120000'),
    ('MT','MT540',':35B:','Identification of Security','ISIN code and description of the financial instrument','ISIN',True,None,'[ISIN1!e12!c]CRLF[4*35x]','ISIN US0378331005\nAPPLE INC'),
    ('MT','MT540',':36B:','Quantity of Instrument','Quantity type (FAMT/UNIT) and amount','QUANTITY',True,None,':4!c//4!c/15d',':SETT//UNIT/1000,'),
    ('MT','MT540',':70E:','Narrative','Additional settlement processing information','NARRATIVE',False,None,':4!c//10*35x',''),
    ('MT','MT540',':95P:','Party (BIC)','DEAG (Delivering Agent), SELL, PSET (Place of Settlement)','BIC',False,None,':4!c//4!a2!a2!c[3!c]',':DEAG//CHASUS33'),
    ('MT','MT540',':95R:','Party (Proprietary)','Party identified by proprietary code','TEXT',False,None,'',''),
    ('MT','MT540',':97A:','Account','SAFE (Safekeeping Account)','ACCOUNT',True,None,':4!c//35x',':SAFE//1234567890'),
    ('MT','MT540',':94B:','Place','Country of settlement, place of trade','CODE',False,None,':4!c//4!c/[30x]',''),
    # ═══════════════════════════════════════════════════════════════
    # MT541 — Receive Against Payment (Securities)
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT541',':20C:','Reference','SEME, POOL, RELA, TRRF references','REFERENCE',True,16,':4!c//16x',':SEME//RF541001'),
    ('MT','MT541',':23G:','Function of Message','NEWM, CANC, PREA','CODE',True,4,'4!c','NEWM'),
    ('MT','MT541',':35B:','Identification of Security','ISIN and security description','ISIN',True,None,'','ISIN GB0002634946'),
    ('MT','MT541',':36B:','Quantity','Settlement quantity FAMT or UNIT','QUANTITY',True,None,':4!c//4!c/15d',':SETT//FAMT/50000,'),
    ('MT','MT541',':19A:','Settlement Amount','Currency and settlement amount to be paid','AMOUNT',True,None,':4!c//3!a15d',':SETT//GBP50000,'),
    ('MT','MT541',':98A:','Date','Trade/settlement dates','DATE',True,8,':4!c//8!n',':TRAD//20250315'),
    ('MT','MT541',':98C:','Date/Time','Date and time with optional UTC','DATETIME',False,None,':4!c//8!n6!n',':PREP//20250315120000'),
    ('MT','MT541',':22F:','Indicator','Settlement transaction type and conditions (SETR, STCO)','CODE',False,None,':4!c//4!c',':SETR//TRAD'),
    ('MT','MT541',':94B:','Place','Country or place of trade/settlement (TRAD, SAFE)','CODE',False,None,':4!c//4!c/[30x]',':TRAD//EXCH/XKLS'),
    ('MT','MT541',':90B:','Deal Price','Price type (DEAL) with format (ACTU/PRCT) and amount','AMOUNT',False,None,':4!c//4!c/3!a15d',':DEAL//ACTU/MYR125.50'),
    ('MT','MT541',':95P:','Party (BIC)','BUYR, DEAG, PSET parties','BIC',False,None,'',':BUYR//DEUTDEFF'),
    ('MT','MT541',':95R:','Party (Proprietary)','Party identified by proprietary code','TEXT',False,None,'',''),
    ('MT','MT541',':97A:','Account','Safekeeping account','ACCOUNT',True,None,'',''),
    ('MT','MT541',':70E:','Narrative','Additional processing information','NARRATIVE',False,None,':4!c//10*35x',''),
    # ═══════════════════════════════════════════════════════════════
    # MT542 — Deliver Free (Securities)
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT542',':20C:','Reference','Sender message reference','REFERENCE',True,16,'',':SEME//RF542001'),
    ('MT','MT542',':23G:','Function of Message','NEWM, CANC, PREA','CODE',True,4,'','NEWM'),
    ('MT','MT542',':35B:','Identification of Security','ISIN and description','ISIN',True,None,'',''),
    ('MT','MT542',':36B:','Quantity','Delivery quantity','QUANTITY',True,None,'',':SETT//UNIT/500,'),
    ('MT','MT542',':98A:','Date','Settlement/trade dates','DATE',True,8,'',''),
    ('MT','MT542',':98C:','Date/Time','Date and time with optional UTC','DATETIME',False,None,'',''),
    ('MT','MT542',':22F:','Indicator','Settlement transaction type (SETR, STCO)','CODE',False,None,':4!c//4!c',':SETR//TRAD'),
    ('MT','MT542',':94B:','Place','Place of trade/settlement','CODE',False,None,':4!c//4!c/[30x]',':TRAD//EXCH/XKLS'),
    ('MT','MT542',':90B:','Deal Price','Price type and amount','AMOUNT',False,None,'',''),
    ('MT','MT542',':95P:','Party (BIC)','REAG (Receiving Agent), BUYR, PSET','BIC',False,None,'',''),
    ('MT','MT542',':97A:','Account','Safekeeping account','ACCOUNT',True,None,'',''),
    ('MT','MT542',':70E:','Narrative','Additional processing information','NARRATIVE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT543 — Deliver Against Payment (Securities)
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT543',':20C:','Reference','Sender message reference','REFERENCE',True,16,'',':SEME//RF543001'),
    ('MT','MT543',':23G:','Function of Message','NEWM, CANC, PREA','CODE',True,4,'','NEWM'),
    ('MT','MT543',':35B:','Identification of Security','ISIN and description','ISIN',True,None,'',''),
    ('MT','MT543',':36B:','Quantity','Delivery quantity','QUANTITY',True,None,'',''),
    ('MT','MT543',':19A:','Settlement Amount','Amount to receive','AMOUNT',True,None,'',':SETT//USD100000,'),
    ('MT','MT543',':98A:','Date','Settlement/trade dates','DATE',True,8,'',''),
    ('MT','MT543',':98C:','Date/Time','Date and time with optional UTC','DATETIME',False,None,'',''),
    ('MT','MT543',':22F:','Indicator','Settlement transaction type (SETR, STCO)','CODE',False,None,':4!c//4!c',':SETR//TRAD'),
    ('MT','MT543',':94B:','Place','Place of trade/settlement','CODE',False,None,':4!c//4!c/[30x]',':TRAD//EXCH/XKLS'),
    ('MT','MT543',':90B:','Deal Price','Price type and amount','AMOUNT',False,None,':4!c//4!c/3!a15d',':DEAL//ACTU/MYR125.50'),
    ('MT','MT543',':95P:','Party (BIC)','REAG, SELL, PSET','BIC',False,None,'',''),
    ('MT','MT543',':97A:','Account','Safekeeping account','ACCOUNT',True,None,'',''),
    ('MT','MT543',':70E:','Narrative','Additional processing information','NARRATIVE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT544 — Receive Free Confirmation
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT544',':20C:','Reference','SEME, RELA, COMM references','REFERENCE',True,16,'',':SEME//PRB070YL5A001'),
    ('MT','MT544',':23G:','Function of Message','NEWM, CANC','CODE',True,4,'','NEWM'),
    ('MT','MT544',':98A:','Date','Trade/settlement dates (TRAD, ESET)','DATE',True,8,'',''),
    ('MT','MT544',':98C:','Date/Time','Preparation timestamp','DATETIME',False,None,'',''),
    ('MT','MT544',':35B:','Identification of Security','ISIN and security description','ISIN',True,None,'',''),
    ('MT','MT544',':36B:','Quantity','Settled quantity (ESTT)','QUANTITY',True,None,'',''),
    ('MT','MT544',':22F:','Indicator','Settlement type (SETR)','CODE',False,None,'',''),
    ('MT','MT544',':95P:','Party (BIC)','DEAG, SELL, PSET parties','BIC',False,None,'',''),
    ('MT','MT544',':95R:','Party (Proprietary)','DEAG, DECU proprietary codes','TEXT',False,None,'',''),
    ('MT','MT544',':97A:','Account','Safekeeping and cash accounts (SAFE, CASH)','ACCOUNT',True,None,'',''),
    ('MT','MT544',':94F:','Place (BIC)','Place of safekeeping CUST/ICSD','CODE',False,None,'',''),
    ('MT','MT544',':13A:','Number Identification','Linked message type (e.g. 540)','CODE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT545 — Receive Against Payment Confirmation
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT545',':20C:','Reference','SEME, RELA references','REFERENCE',True,16,'',''),
    ('MT','MT545',':23G:','Function of Message','NEWM, CANC','CODE',True,4,'','NEWM'),
    ('MT','MT545',':98A:','Date','Trade/settlement dates','DATE',True,8,'',''),
    ('MT','MT545',':98C:','Date/Time','Preparation timestamp','DATETIME',False,None,'',''),
    ('MT','MT545',':35B:','Identification of Security','ISIN and description','ISIN',True,None,'',''),
    ('MT','MT545',':36B:','Quantity','Settled quantity','QUANTITY',True,None,'',''),
    ('MT','MT545',':19A:','Settlement Amount','Settled amount','AMOUNT',True,None,'',''),
    ('MT','MT545',':22F:','Indicator','Settlement type','CODE',False,None,'',''),
    ('MT','MT545',':95P:','Party (BIC)','DEAG, SELL, PSET parties','BIC',False,None,'',''),
    ('MT','MT545',':97A:','Account','Safekeeping account','ACCOUNT',True,None,'',''),
    ('MT','MT545',':13A:','Number Identification','Linked message type (e.g. 541)','CODE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT546 — Deliver Free Confirmation
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT546',':20C:','Reference','SEME, RELA references','REFERENCE',True,16,'',''),
    ('MT','MT546',':23G:','Function of Message','NEWM, CANC','CODE',True,4,'','NEWM'),
    ('MT','MT546',':98A:','Date','Trade/settlement dates','DATE',True,8,'',''),
    ('MT','MT546',':98C:','Date/Time','Preparation timestamp','DATETIME',False,None,'',''),
    ('MT','MT546',':35B:','Identification of Security','ISIN and description','ISIN',True,None,'',''),
    ('MT','MT546',':36B:','Quantity','Settled quantity','QUANTITY',True,None,'',''),
    ('MT','MT546',':22F:','Indicator','Settlement type','CODE',False,None,'',''),
    ('MT','MT546',':94F:','Place (BIC)','Place of safekeeping','CODE',False,None,'',''),
    ('MT','MT546',':95P:','Party (BIC)','REAG, BUYR, PSET parties','BIC',False,None,'',''),
    ('MT','MT546',':95R:','Party (Proprietary)','REAG proprietary codes','TEXT',False,None,'',''),
    ('MT','MT546',':97A:','Account','Safekeeping account','ACCOUNT',True,None,'',''),
    ('MT','MT546',':13A:','Number Identification','Linked message type (e.g. 542)','CODE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT547 — Deliver Against Payment Confirmation
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT547',':20C:','Reference','SEME, RELA references','REFERENCE',True,16,'',''),
    ('MT','MT547',':23G:','Function of Message','NEWM, CANC','CODE',True,4,'','NEWM'),
    ('MT','MT547',':98A:','Date','Trade/settlement dates','DATE',True,8,'',''),
    ('MT','MT547',':98C:','Date/Time','Preparation timestamp','DATETIME',False,None,'',''),
    ('MT','MT547',':35B:','Identification of Security','ISIN and description','ISIN',True,None,'',''),
    ('MT','MT547',':36B:','Quantity','Settled quantity','QUANTITY',True,None,'',''),
    ('MT','MT547',':19A:','Settlement Amount','Settled amount','AMOUNT',True,None,'',''),
    ('MT','MT547',':22F:','Indicator','Settlement type','CODE',False,None,'',''),
    ('MT','MT547',':95P:','Party (BIC)','REAG, BUYR, PSET parties','BIC',False,None,'',''),
    ('MT','MT547',':97A:','Account','Safekeeping account','ACCOUNT',True,None,'',''),
    ('MT','MT547',':13A:','Number Identification','Linked message type (e.g. 543)','CODE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT210 — Notice to Receive
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT210',':20:','Transaction Reference','Sender reference for the notice','REFERENCE',True,16,'',''),
    ('MT','MT210',':21:','Related Reference','Reference to expected incoming payment','REFERENCE',False,16,'',''),
    ('MT','MT210',':25:','Account Identification','Account to receive the credit','ACCOUNT',False,35,'',''),
    ('MT','MT210',':30:','Value Date','Expected value date YYMMDD','DATE',True,6,'6!n',''),
    ('MT','MT210',':32B:','Currency/Amount','Expected amount and currency','AMOUNT',True,18,'3!a15d',''),
    ('MT','MT210',':52A:','Ordering Institution','Bank originating the payment','BIC',False,None,'',''),
    ('MT','MT210',':56A:','Intermediary Institution','Intermediary bank','BIC',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT565 — Corporate Action Instruction
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT565',':20C:','Reference','SEME, COAF (Corp Action Event Ref)','REFERENCE',True,16,'',':SEME//CA565001'),
    ('MT','MT565',':23G:','Function of Message','INST, CANC, REPR, RMDR','CODE',True,4,'','INST'),
    ('MT','MT565',':22F:','Indicator','CAOP (option type), CAEV (event type)','CODE',True,None,'',':CAEV//DVCA'),
    ('MT','MT565',':35B:','Identification of Security','ISIN of the security under corporate action','ISIN',True,None,'',''),
    ('MT','MT565',':36B:','Instructed Quantity','Quantity for which instruction applies','QUANTITY',False,None,'',''),
    ('MT','MT565',':93B:','Balance','Total eligible balance, confirmed/instructed balance','QUANTITY',False,None,'',''),
    ('MT','MT565',':98A:','Date','Effective date, payment date, deadline','DATE',True,8,'',''),
    ('MT','MT565',':70E:','Narrative','Additional instruction details','NARRATIVE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT700 — Issue of a Documentary Credit
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT700',':20:','Documentary Credit Number','Issuing bank reference for the LC','REFERENCE',True,16,'','LC20250315001'),
    ('MT','MT700',':27:','Sequence of Total','Page sequence e.g. 1/1','TEXT',True,5,'','1/1'),
    ('MT','MT700',':31C:','Date of Issue','Date the LC is issued','DATE',True,8,'','20250315'),
    ('MT','MT700',':31D:','Date/Place of Expiry','Expiry date and location','TEXT',True,None,'','250615KUALA LUMPUR'),
    ('MT','MT700',':32B:','Currency/Amount','LC amount','AMOUNT',True,18,'','USD500000,'),
    ('MT','MT700',':39A:','Percentage Credit Amount Tolerance','Plus/minus tolerance percentage','TEXT',False,None,'','5/5'),
    ('MT','MT700',':41A:','Available With/By','Bank and method (BY NEGOTIATION, BY PAYMENT)','TEXT',True,None,'',''),
    ('MT','MT700',':42C:','Drafts At','Tenor of drafts','TEXT',False,None,'','AT SIGHT'),
    ('MT','MT700',':43P:','Partial Shipments','ALLOWED or NOT ALLOWED','CODE',False,None,'','ALLOWED'),
    ('MT','MT700',':43T:','Transhipment','ALLOWED or NOT ALLOWED','CODE',False,None,'','ALLOWED'),
    ('MT','MT700',':44A:','Place of Taking in Charge','Port/place of origin','TEXT',False,None,'',''),
    ('MT','MT700',':44E:','Port of Loading','Port of loading','TEXT',False,None,'','PORT KLANG'),
    ('MT','MT700',':44F:','Port of Discharge','Port of discharge','TEXT',False,None,'','ROTTERDAM'),
    ('MT','MT700',':44C:','Latest Date of Shipment','Last allowed shipping date','DATE',False,8,'','20250601'),
    ('MT','MT700',':45A:','Description of Goods','Detailed goods description','NARRATIVE',True,None,'','ELECTRONIC COMPONENTS'),
    ('MT','MT700',':46A:','Documents Required','List of required documents','NARRATIVE',True,None,'',''),
    ('MT','MT700',':47A:','Additional Conditions','Special LC conditions','NARRATIVE',False,None,'',''),
    ('MT','MT700',':49:','Confirmation Instructions','CONFIRM, MAY ADD, WITHOUT','CODE',True,None,'','CONFIRM'),
    ('MT','MT700',':71B:','Charges','Charge allocation','TEXT',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT940 — Customer Statement Message
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT940',':20:','Transaction Reference','Statement reference number','REFERENCE',True,16,'','STMT20250315'),
    ('MT','MT940',':21:','Related Reference','Reference to MT920 request if applicable','REFERENCE',False,16,'',''),
    ('MT','MT940',':25:','Account Identification','Account number for which statement is sent','ACCOUNT',True,35,'','MY12345678901234'),
    ('MT','MT940',':28C:','Statement Number/Sequence','Sequential statement number / page sequence','TEXT',True,None,'5n[/5n]','00015/001'),
    ('MT','MT940',':60F:','Opening Balance (First)','D/C flag, date, currency, opening balance amount','AMOUNT',True,None,'1!a6!n3!a15d','C250314MYR1000000,50'),
    ('MT','MT940',':60M:','Opening Balance (Intermediate)','Intermediate opening balance for multi-page statements','AMOUNT',False,None,'',''),
    ('MT','MT940',':61:','Statement Line','Individual transaction: value date, D/C, amount, type, ref','TEXT',True,None,'6!n[4!n]2a[1!a]15d1!a3!c16x[//16x][CRLF34x]','2503150315D50000,NTRF1234567890//REF001'),
    ('MT','MT940',':62F:','Closing Balance (Booked)','D/C flag, date, currency, closing balance amount','AMOUNT',True,None,'1!a6!n3!a15d','C250315MYR950000,50'),
    ('MT','MT940',':62M:','Closing Balance (Intermediate)','Intermediate closing balance','AMOUNT',False,None,'',''),
    ('MT','MT940',':64:','Closing Available Balance','Available balance after all entries','AMOUNT',False,None,'',''),
    ('MT','MT940',':65:','Forward Available Balance','Projected available balance for future dates','AMOUNT',False,None,'',''),
    ('MT','MT940',':86:','Information to Account Owner','Additional transaction details, references, narrative','NARRATIVE',False,None,'6*65x',''),
    # ═══════════════════════════════════════════════════════════════
    # MT950 — Statement Message (Correspondent)
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT950',':20:','Transaction Reference','Statement reference','REFERENCE',True,16,'','STMT950-001'),
    ('MT','MT950',':25:','Account Identification','Nostro/Vostro account number','ACCOUNT',True,35,'',''),
    ('MT','MT950',':28C:','Statement Number','Sequential number','TEXT',True,None,'',''),
    ('MT','MT950',':60F:','Opening Balance','Opening balance (first page)','AMOUNT',True,None,'',''),
    ('MT','MT950',':61:','Statement Line','Individual debit/credit entries','TEXT',True,None,'',''),
    ('MT','MT950',':62F:','Closing Balance','Closing booked balance','AMOUNT',True,None,'',''),
    ('MT','MT950',':64:','Closing Available Balance','Available balance','AMOUNT',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MT900 / MT910 — Debit/Credit Confirmations
    # ═══════════════════════════════════════════════════════════════
    ('MT','MT900',':20:','Transaction Reference','Reference for the debit confirmation','REFERENCE',True,16,'',''),
    ('MT','MT900',':21:','Related Reference','Reference of the original payment','REFERENCE',True,16,'',''),
    ('MT','MT900',':25:','Account Identification','Account debited','ACCOUNT',True,35,'',''),
    ('MT','MT900',':32A:','Value Date/Currency/Amount','Debit date and amount','AMOUNT',True,24,'',''),
    ('MT','MT910',':20:','Transaction Reference','Reference for the credit confirmation','REFERENCE',True,16,'',''),
    ('MT','MT910',':21:','Related Reference','Reference of the original payment','REFERENCE',True,16,'',''),
    ('MT','MT910',':25:','Account Identification','Account credited','ACCOUNT',True,35,'',''),
    ('MT','MT910',':32A:','Value Date/Currency/Amount','Credit date and amount','AMOUNT',True,24,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pacs.008 (Customer Credit Transfer — replaces MT103)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pacs.008','MsgId','Message Identification','Unique ID assigned by the instructing party','REFERENCE',True,35,'','MSG20250315001'),
    ('MX','pacs.008','CreDtTm','Creation Date Time','ISO date-time when message was created','DATETIME',True,None,'YYYY-MM-DDThh:mm:ss','2025-03-15T12:00:00'),
    ('MX','pacs.008','NbOfTxs','Number of Transactions','Total count of individual transactions in the message','TEXT',True,15,'','1'),
    ('MX','pacs.008','SttlmMtd','Settlement Method','INDA, INGA, CLRG, COVE','CODE',True,4,'','CLRG'),
    ('MX','pacs.008','PmtId/InstrId','Instruction Identification','Unique ID for the payment instruction','REFERENCE',False,35,'','INSTR001'),
    ('MX','pacs.008','PmtId/EndToEndId','End to End Identification','Unique ID assigned by initiating party, carried throughout','REFERENCE',True,35,'','E2E20250315001'),
    ('MX','pacs.008','PmtId/TxId','Transaction Identification','Unique ID assigned by first instructing agent','REFERENCE',True,35,'','TX20250315001'),
    ('MX','pacs.008','PmtId/UETR','UETR','Unique End-to-End Transaction Reference (UUID v4) for gpi tracking','REFERENCE',True,36,'','eb6305c9-1f7a-4c87-bb44-0471e8c8e5f4'),
    ('MX','pacs.008','IntrBkSttlmAmt','Interbank Settlement Amount','Settlement amount with currency attribute','AMOUNT',True,None,'Ccy="XXX"','1000000.50'),
    ('MX','pacs.008','IntrBkSttlmDt','Interbank Settlement Date','Value date for settlement','DATE',True,10,'YYYY-MM-DD','2025-03-17'),
    ('MX','pacs.008','ChrgBr','Charge Bearer','DEBT, CRED, SHAR, SLEV','CODE',True,4,'','SHAR'),
    ('MX','pacs.008','InstgAgt/BIC','Instructing Agent BIC','BIC of the instructing financial institution','BIC',True,11,'','DEUTDEFFXXX'),
    ('MX','pacs.008','InstdAgt/BIC','Instructed Agent BIC','BIC of the instructed financial institution','BIC',True,11,'','BNPAFRPPXXX'),
    ('MX','pacs.008','Dbtr/Nm','Debtor Name','Name of the payer/debtor','TEXT',True,140,'','JOHN DOE'),
    ('MX','pacs.008','Dbtr/PstlAdr','Debtor Postal Address','Structured address: StrtNm, BldgNb, PstCd, TwnNm, Ctry (mandatory from Nov 2025)','TEXT',True,None,'',''),
    ('MX','pacs.008','DbtrAcct/IBAN','Debtor Account IBAN','IBAN of the debtor','ACCOUNT',False,34,'','GB82WEST12345698765432'),
    ('MX','pacs.008','DbtrAgt/BIC','Debtor Agent BIC','BIC of the debtor bank','BIC',True,11,'','WESTGB2L'),
    ('MX','pacs.008','CdtrAgt/BIC','Creditor Agent BIC','BIC of the creditor bank','BIC',True,11,'','BNPAFRPPXXX'),
    ('MX','pacs.008','Cdtr/Nm','Creditor Name','Name of the beneficiary/creditor','TEXT',True,140,'','ACME CORPORATION'),
    ('MX','pacs.008','Cdtr/PstlAdr','Creditor Postal Address','Structured address with TwnNm + Ctry mandatory from Nov 2025','TEXT',True,None,'',''),
    ('MX','pacs.008','CdtrAcct/IBAN','Creditor Account IBAN','IBAN of the creditor','ACCOUNT',False,34,'','FR7630006000011234567890189'),
    ('MX','pacs.008','RmtInf/Ustrd','Remittance Info (Unstructured)','Free-text payment reference','TEXT',False,140,'','INV-2025-00123'),
    ('MX','pacs.008','RgltryRptg','Regulatory Reporting','Regulatory/tax reporting information','TEXT',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pacs.009 (FI Credit Transfer — replaces MT202)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pacs.009','MsgId','Message Identification','Unique message ID','REFERENCE',True,35,'',''),
    ('MX','pacs.009','CreDtTm','Creation Date Time','Message creation timestamp','DATETIME',True,None,'',''),
    ('MX','pacs.009','PmtId/InstrId','Instruction Identification','Unique instruction ID','REFERENCE',False,35,'',''),
    ('MX','pacs.009','PmtId/EndToEndId','End to End Identification','End-to-end reference','REFERENCE',True,35,'',''),
    ('MX','pacs.009','PmtId/TxId','Transaction Identification','Transaction reference','REFERENCE',True,35,'',''),
    ('MX','pacs.009','PmtId/UETR','UETR','gpi tracking UUID','REFERENCE',True,36,'',''),
    ('MX','pacs.009','IntrBkSttlmAmt','Interbank Settlement Amount','Amount with currency','AMOUNT',True,None,'',''),
    ('MX','pacs.009','IntrBkSttlmDt','Interbank Settlement Date','Value date','DATE',True,10,'',''),
    ('MX','pacs.009','InstgAgt/BIC','Instructing Agent','Sending FI BIC','BIC',True,11,'',''),
    ('MX','pacs.009','InstdAgt/BIC','Instructed Agent','Receiving FI BIC','BIC',True,11,'',''),
    ('MX','pacs.009','CdtrAgt/BIC','Creditor Agent','Beneficiary bank BIC','BIC',False,11,'',''),
    ('MX','pacs.009','Cdtr/BIC','Creditor Institution','Beneficiary FI BIC','BIC',True,11,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pacs.002 (Payment Status Report)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pacs.002','MsgId','Message Identification','Status report message ID','REFERENCE',True,35,'',''),
    ('MX','pacs.002','OrgnlMsgId','Original Message ID','Reference to original pacs.008/009','REFERENCE',True,35,'',''),
    ('MX','pacs.002','OrgnlEndToEndId','Original End-to-End ID','Original E2E reference','REFERENCE',True,35,'',''),
    ('MX','pacs.002','TxSts','Transaction Status','ACCP, RJCT, PDNG, ACSP, ACSC, ACCC','CODE',True,4,'','ACSP'),
    ('MX','pacs.002','StsRsnInf/Rsn','Status Reason','Reason code for rejection/pending','CODE',False,4,'','AC01'),
    # ═══════════════════════════════════════════════════════════════
    # MX — pacs.004 (Payment Return)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pacs.004','MsgId','Message Identification','Return message ID','REFERENCE',True,35,'',''),
    ('MX','pacs.004','OrgnlMsgId','Original Message ID','Reference to the returned payment','REFERENCE',True,35,'',''),
    ('MX','pacs.004','RtrdIntrBkSttlmAmt','Returned Amount','Amount being returned','AMOUNT',True,None,'',''),
    ('MX','pacs.004','RtrRsnInf/Rsn','Return Reason','Reason code: AC04, AM05, MS03, etc.','CODE',True,4,'','AC04'),
    # ═══════════════════════════════════════════════════════════════
    # MX — camt.053 (Bank-to-Customer Statement — replaces MT940)
    # ═══════════════════════════════════════════════════════════════
    ('MX','camt.053','MsgId','Message Identification','Statement message ID','REFERENCE',True,35,'',''),
    ('MX','camt.053','CreDtTm','Creation Date Time','Statement creation timestamp','DATETIME',True,None,'',''),
    ('MX','camt.053','Acct/Id/IBAN','Account IBAN','Account for which statement is provided','ACCOUNT',True,34,'',''),
    ('MX','camt.053','Bal/Tp/CdOrPrtry','Balance Type','OPBD (Opening), CLBD (Closing), CLAV (Available), FWAV (Forward)','CODE',True,4,'','OPBD'),
    ('MX','camt.053','Bal/Amt','Balance Amount','Balance amount with currency','AMOUNT',True,None,'',''),
    ('MX','camt.053','Bal/CdtDbtInd','Credit/Debit Indicator','CRDT or DBIT','CODE',True,4,'','CRDT'),
    ('MX','camt.053','Bal/Dt','Balance Date','Date of the balance','DATE',True,10,'',''),
    ('MX','camt.053','Ntry/Amt','Entry Amount','Transaction amount','AMOUNT',True,None,'',''),
    ('MX','camt.053','Ntry/CdtDbtInd','Entry Credit/Debit','CRDT or DBIT for each entry','CODE',True,4,'',''),
    ('MX','camt.053','Ntry/ValDt','Entry Value Date','Value date of the transaction','DATE',True,10,'',''),
    ('MX','camt.053','Ntry/BkTxCd','Bank Transaction Code','Proprietary or ISO bank transaction code','CODE',False,None,'',''),
    ('MX','camt.053','Ntry/AddtlNtryInf','Additional Entry Info','Narrative info about the transaction','NARRATIVE',False,500,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — camt.054 (Bank-to-Customer Debit/Credit Notification)
    # ═══════════════════════════════════════════════════════════════
    ('MX','camt.054','MsgId','Message Identification','Notification message ID','REFERENCE',True,35,'',''),
    ('MX','camt.054','Ntfctn/Id','Notification ID','Unique notification identification','REFERENCE',True,35,'',''),
    ('MX','camt.054','Acct/Id/IBAN','Account IBAN','Account notified','ACCOUNT',True,34,'',''),
    ('MX','camt.054','Ntry/Amt','Entry Amount','Credited or debited amount','AMOUNT',True,None,'',''),
    ('MX','camt.054','Ntry/CdtDbtInd','Credit/Debit','CRDT or DBIT','CODE',True,4,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — camt.056 (Return Request — replaces MT192/MT292)
    # ═══════════════════════════════════════════════════════════════
    ('MX','camt.056','MsgId','Message Identification','Cancellation request message ID','REFERENCE',True,35,'',''),
    ('MX','camt.056','OrgnlMsgId','Original Message ID','Reference to payment being cancelled','REFERENCE',True,35,'',''),
    ('MX','camt.056','OrgnlEndToEndId','Original E2E ID','Original end-to-end reference','REFERENCE',True,35,'',''),
    ('MX','camt.056','CxlRsnInf/Rsn','Cancellation Reason','DUPL, AGNT, CUST, FRAD, etc.','CODE',True,4,'','DUPL'),
    # ═══════════════════════════════════════════════════════════════
    # MX — pain.001 (Customer Credit Transfer Initiation)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pain.001','MsgId','Message Identification','Payment initiation message ID','REFERENCE',True,35,'',''),
    ('MX','pain.001','CreDtTm','Creation Date Time','Initiation timestamp','DATETIME',True,None,'',''),
    ('MX','pain.001','NbOfTxs','Number of Transactions','Count of payment instructions','TEXT',True,15,'',''),
    ('MX','pain.001','CtrlSum','Control Sum','Total of all individual amounts','AMOUNT',False,None,'',''),
    ('MX','pain.001','PmtInfId','Payment Information ID','Unique payment batch ID','REFERENCE',True,35,'',''),
    ('MX','pain.001','PmtMtd','Payment Method','TRF (Transfer), CHK (Cheque), TRA (Transfer Advice)','CODE',True,3,'','TRF'),
    ('MX','pain.001','ReqdExctnDt','Requested Execution Date','Date customer wants payment executed','DATE',True,10,'',''),
    ('MX','pain.001','Dbtr/Nm','Debtor Name','Originator name','TEXT',True,140,'',''),
    ('MX','pain.001','DbtrAcct/IBAN','Debtor Account','Originator account IBAN','ACCOUNT',True,34,'',''),
    ('MX','pain.001','DbtrAgt/BIC','Debtor Agent','Originator bank BIC','BIC',True,11,'',''),
    ('MX','pain.001','CdtrAgt/BIC','Creditor Agent','Beneficiary bank BIC','BIC',True,11,'',''),
    ('MX','pain.001','Cdtr/Nm','Creditor Name','Beneficiary name','TEXT',True,140,'',''),
    ('MX','pain.001','CdtrAcct/IBAN','Creditor Account','Beneficiary IBAN','ACCOUNT',True,34,'',''),
    ('MX','pain.001','Amt/InstdAmt','Instructed Amount','Payment amount with currency','AMOUNT',True,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pain.002 (Payment Status Report from Bank)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pain.002','MsgId','Message Identification','Status report ID','REFERENCE',True,35,'',''),
    ('MX','pain.002','OrgnlMsgId','Original Message ID','Reference to pain.001','REFERENCE',True,35,'',''),
    ('MX','pain.002','GrpSts','Group Status','ACCP, ACSP, RJCT, PDNG, PART','CODE',False,4,'',''),
    ('MX','pain.002','TxSts','Transaction Status','Per-transaction status','CODE',False,4,'',''),
    ('MX','pain.002','StsRsnInf/Rsn','Status Reason','Reason code for failure','CODE',False,4,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pacs.007 (FI to FI Payment Reversal)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pacs.007','MsgId','Message Identification','Reversal message ID','REFERENCE',True,35,'',''),
    ('MX','pacs.007','OrgnlMsgId','Original Message ID','Reference to reversed payment','REFERENCE',True,35,'',''),
    ('MX','pacs.007','OrgnlEndToEndId','Original End-to-End ID','Original e2e reference','REFERENCE',True,35,'',''),
    ('MX','pacs.007','RvsdIntrBkSttlmAmt','Reversed Amount','Amount being reversed','AMOUNT',True,None,'',''),
    ('MX','pacs.007','IntrBkSttlmDt','Settlement Date','Settlement date of reversal','DATE',True,10,'',''),
    ('MX','pacs.007','RvslRsnInf/Rsn','Reversal Reason','Reason code: DUPL, FRAD, TECH, etc.','CODE',True,4,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pacs.028 (Payment Status Request)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pacs.028','MsgId','Message Identification','Status request message ID','REFERENCE',True,35,'',''),
    ('MX','pacs.028','OrgnlMsgId','Original Message ID','Reference to queried payment','REFERENCE',True,35,'',''),
    ('MX','pacs.028','OrgnlEndToEndId','Original End-to-End ID','Original e2e reference','REFERENCE',True,35,'',''),
    ('MX','pacs.028','OrgnlUETR','Original UETR','UETR of original payment','REFERENCE',False,36,'',''),
    ('MX','pacs.028','InstgAgt/BIC','Instructing Agent','BIC of requesting institution','BIC',True,11,'',''),
    ('MX','pacs.028','InstdAgt/BIC','Instructed Agent','BIC of queried institution','BIC',True,11,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — camt.029 (Resolution of Investigation)
    # ═══════════════════════════════════════════════════════════════
    ('MX','camt.029','MsgId','Message Identification','Resolution message ID','REFERENCE',True,35,'',''),
    ('MX','camt.029','InvstgtnSts','Investigation Status','CONF (Confirmed), RJCT (Rejected)','CODE',True,4,'',''),
    ('MX','camt.029','OrgnlMsgId','Original Message ID','Reference to original message','REFERENCE',True,35,'',''),
    ('MX','camt.029','CxlDtls/Rsn','Cancellation Reason','Reason for cancellation resolution','CODE',False,4,'',''),
    ('MX','camt.029','Conf','Confirmation','CNCL (Cancelled), RJCR (Reject Request)','CODE',False,4,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — camt.052 (Bank to Customer Account Report — intraday)
    # ═══════════════════════════════════════════════════════════════
    ('MX','camt.052','MsgId','Message Identification','Report message ID','REFERENCE',True,35,'',''),
    ('MX','camt.052','CreDtTm','Creation Date Time','Report creation timestamp','DATETIME',True,None,'',''),
    ('MX','camt.052','Acct/Id/IBAN','Account IBAN','Reported account IBAN','ACCOUNT',True,34,'',''),
    ('MX','camt.052','Bal/Amt','Balance Amount','Intraday balance','AMOUNT',False,None,'',''),
    ('MX','camt.052','Ntry/Amt','Entry Amount','Transaction amount','AMOUNT',False,None,'',''),
    ('MX','camt.052','Ntry/CdtDbtInd','Credit/Debit','CRDT or DBIT','CODE',False,4,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — camt.057 (Notification to Receive — replaces MT210)
    # ═══════════════════════════════════════════════════════════════
    ('MX','camt.057','MsgId','Message Identification','Notification message ID','REFERENCE',True,35,'',''),
    ('MX','camt.057','CreDtTm','Creation Date Time','Notification timestamp','DATETIME',True,None,'',''),
    ('MX','camt.057','Ntfctn/Id','Notification ID','Unique notification ID','REFERENCE',True,35,'',''),
    ('MX','camt.057','Itm/EndToEndId','End to End ID','E2E reference of expected payment','REFERENCE',True,35,'',''),
    ('MX','camt.057','Itm/Amt','Expected Amount','Amount expected to receive','AMOUNT',True,None,'',''),
    ('MX','camt.057','Itm/XpctdValDt','Expected Value Date','Expected settlement date','DATE',True,10,'',''),
    ('MX','camt.057','DbtrAgt/BIC','Debtor Agent','Sending bank BIC','BIC',False,11,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — camt.060 (Account Reporting Request)
    # ═══════════════════════════════════════════════════════════════
    ('MX','camt.060','MsgId','Message Identification','Request message ID','REFERENCE',True,35,'',''),
    ('MX','camt.060','Acct/Id/IBAN','Account IBAN','Account for which report is requested','ACCOUNT',True,34,'',''),
    ('MX','camt.060','RptgReq/ReqdMsgNmId','Requested Report Type','camt.052, camt.053, or camt.054','CODE',True,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pain.007 (Customer Payment Reversal)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pain.007','MsgId','Message Identification','Reversal message ID','REFERENCE',True,35,'',''),
    ('MX','pain.007','OrgnlMsgId','Original Message ID','Reference to original pain.001','REFERENCE',True,35,'',''),
    ('MX','pain.007','OrgnlEndToEndId','Original End-to-End ID','Original e2e reference','REFERENCE',True,35,'',''),
    ('MX','pain.007','RvslRsnInf/Rsn','Reversal Reason','DUPL, AGNT, CUST, etc.','CODE',True,4,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pain.008 (Customer Direct Debit Initiation)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pain.008','MsgId','Message Identification','Direct debit initiation ID','REFERENCE',True,35,'',''),
    ('MX','pain.008','CreDtTm','Creation Date Time','Initiation timestamp','DATETIME',True,None,'',''),
    ('MX','pain.008','NbOfTxs','Number of Transactions','Total direct debit transactions','TEXT',True,15,'',''),
    ('MX','pain.008','PmtInfId','Payment Information ID','Batch ID','REFERENCE',True,35,'',''),
    ('MX','pain.008','ReqdColltnDt','Requested Collection Date','Date to collect funds','DATE',True,10,'',''),
    ('MX','pain.008','Cdtr/Nm','Creditor Name','Party collecting the payment','TEXT',True,140,'',''),
    ('MX','pain.008','CdtrAcct/IBAN','Creditor Account','Collecting party account','ACCOUNT',True,34,'',''),
    ('MX','pain.008','Dbtr/Nm','Debtor Name','Party being debited','TEXT',True,140,'',''),
    ('MX','pain.008','DbtrAcct/IBAN','Debtor Account','Account to be debited','ACCOUNT',True,34,'',''),
    ('MX','pain.008','InstdAmt','Instructed Amount','Amount to collect','AMOUNT',True,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — pain.013 (Creditor Payment Activation Request)
    # ═══════════════════════════════════════════════════════════════
    ('MX','pain.013','MsgId','Message Identification','Activation request ID','REFERENCE',True,35,'',''),
    ('MX','pain.013','PmtInfId','Payment Information ID','Batch ID','REFERENCE',True,35,'',''),
    ('MX','pain.013','Cdtr/Nm','Creditor Name','Creditor requesting payment','TEXT',True,140,'',''),
    ('MX','pain.013','Dbtr/Nm','Debtor Name','Debtor to be charged','TEXT',True,140,'',''),
    ('MX','pain.013','InstdAmt','Instructed Amount','Requested amount','AMOUNT',True,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — sese.023 (Securities Settlement Instruction)
    # ═══════════════════════════════════════════════════════════════
    ('MX','sese.023','MsgId','Message Identification','Settlement instruction ID','REFERENCE',True,35,'',''),
    ('MX','sese.023','TxId','Transaction Identification','SEME reference','REFERENCE',True,35,'',''),
    ('MX','sese.023','SttlmTpAndAddtlParams','Settlement Type','DVP, RVP, DFP, RFP','CODE',True,None,'',''),
    ('MX','sese.023','TradDt','Trade Date','Execution date of trade','DATE',True,10,'',''),
    ('MX','sese.023','SttlmDt','Settlement Date','Expected settlement date','DATE',True,10,'',''),
    ('MX','sese.023','FinInstrmId/ISIN','ISIN','Security identifier','ISIN',True,12,'',''),
    ('MX','sese.023','SttlmQty/Unit','Settlement Quantity','Number of units to settle','QUANTITY',True,None,'',''),
    ('MX','sese.023','SttlmAmt','Settlement Amount','Cash amount for settlement','AMOUNT',False,None,'',''),
    ('MX','sese.023','DealPric/PricVal','Deal Price','Trade execution price','RATE',False,None,'',''),
    ('MX','sese.023','PlcOfTrad/MktId','Place of Trade','Exchange/market code','CODE',False,None,'',''),
    ('MX','sese.023','SfkpgPlc','Safekeeping Place','Place of safekeeping','CODE',False,None,'',''),
    ('MX','sese.023','SfkpgAcct','Safekeeping Account','Securities account','ACCOUNT',True,None,'',''),
    ('MX','sese.023','DlvrngSttlmPties/BIC','Delivering Party BIC','Delivering agent BIC','BIC',False,11,'',''),
    ('MX','sese.023','RcvgSttlmPties/BIC','Receiving Party BIC','Receiving agent BIC','BIC',False,11,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — sese.024 (Securities Settlement Status Advice)
    # ═══════════════════════════════════════════════════════════════
    ('MX','sese.024','MsgId','Message Identification','Status advice ID','REFERENCE',True,35,'',''),
    ('MX','sese.024','TxId','Transaction Identification','SEME reference','REFERENCE',True,35,'',''),
    ('MX','sese.024','PrcgSts','Processing Status','PACK, REPR, CAND, PEND, SETT','CODE',True,4,'',''),
    ('MX','sese.024','SttlmSts','Settlement Status','PEND, PENF, SETT','CODE',False,4,'',''),
    ('MX','sese.024','Rsn/Cd','Reason Code','Reason for pending/failed status','CODE',False,4,'',''),
    ('MX','sese.024','FinInstrmId/ISIN','ISIN','Security identifier','ISIN',True,12,'',''),
    ('MX','sese.024','SttlmQty/Unit','Settlement Quantity','Quantity','QUANTITY',True,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — sese.025 (Securities Settlement Confirmation)
    # ═══════════════════════════════════════════════════════════════
    ('MX','sese.025','MsgId','Message Identification','Confirmation message ID','REFERENCE',True,35,'',''),
    ('MX','sese.025','TxId','Transaction Identification','SEME reference','REFERENCE',True,35,'',''),
    ('MX','sese.025','TradDt','Trade Date','Trade execution date','DATE',True,10,'',''),
    ('MX','sese.025','SttlmDt','Settlement Date','Actual settlement date','DATE',True,10,'',''),
    ('MX','sese.025','FinInstrmId/ISIN','ISIN','Security identifier','ISIN',True,12,'',''),
    ('MX','sese.025','SttlmQty/Unit','Settlement Quantity','Settled quantity','QUANTITY',True,None,'',''),
    ('MX','sese.025','SttlmAmt','Settlement Amount','Settled cash amount','AMOUNT',False,None,'',''),
    ('MX','sese.025','DealPric/PricVal','Deal Price','Execution price','RATE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — semt.002 (Custody Statement of Holdings)
    # ═══════════════════════════════════════════════════════════════
    ('MX','semt.002','MsgId','Message Identification','Statement of holdings ID','REFERENCE',True,35,'',''),
    ('MX','semt.002','StmtDt','Statement Date','Date of the statement','DATE',True,10,'',''),
    ('MX','semt.002','SfkpgAcct','Safekeeping Account','Securities account','ACCOUNT',True,None,'',''),
    ('MX','semt.002','FinInstrmId/ISIN','ISIN','Security ISIN','ISIN',True,12,'',''),
    ('MX','semt.002','Bal/ShrtLngPos','Short/Long Position','SHORT or LONG','CODE',True,5,'',''),
    ('MX','semt.002','Bal/Qty/Unit','Holding Quantity','Number of units held','QUANTITY',True,None,'',''),
    ('MX','semt.002','PricDtls/PricVal','Market Price','Current market price','RATE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — semt.017 (Securities Transaction Posting Report)
    # ═══════════════════════════════════════════════════════════════
    ('MX','semt.017','MsgId','Message Identification','Posting report ID','REFERENCE',True,35,'',''),
    ('MX','semt.017','SfkpgAcct','Safekeeping Account','Securities account','ACCOUNT',True,None,'',''),
    ('MX','semt.017','FinInstrmId/ISIN','ISIN','Security ISIN','ISIN',True,12,'',''),
    ('MX','semt.017','Tx/SttlmDt','Settlement Date','Transaction settlement date','DATE',True,10,'',''),
    ('MX','semt.017','Tx/SttlmQty/Unit','Settlement Quantity','Settled units','QUANTITY',True,None,'',''),
    ('MX','semt.017','Tx/SttlmAmt','Settlement Amount','Cash amount settled','AMOUNT',False,None,'',''),
    ('MX','semt.017','Tx/DealPric/PricVal','Deal Price','Transaction price','RATE',False,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — seev.031 (Corporate Action Notification)
    # ═══════════════════════════════════════════════════════════════
    ('MX','seev.031','MsgId','Message Identification','CA notification ID','REFERENCE',True,35,'',''),
    ('MX','seev.031','CorpActnGnlInf/EvtTp','Event Type','DVCA, DRIP, TEND, etc.','CODE',True,4,'',''),
    ('MX','seev.031','CorpActnGnlInf/CorpActnEvtId','Event ID','Corporate action event identifier','REFERENCE',True,35,'',''),
    ('MX','seev.031','FinInstrmId/ISIN','ISIN','Security ISIN','ISIN',True,12,'',''),
    ('MX','seev.031','DtDtls/ExDt','Ex-Date','Date from which security trades without entitlement','DATE',False,10,'',''),
    ('MX','seev.031','DtDtls/RcrdDt','Record Date','Date to determine entitlement','DATE',False,10,'',''),
    ('MX','seev.031','DtDtls/PmtDt','Payment Date','Date of cash/security distribution','DATE',False,10,'',''),
    ('MX','seev.031','CorpActnOptnDtls/OptnTp','Option Type','CASH, SECU, MPUT, BIDS','CODE',False,4,'',''),
    # ═══════════════════════════════════════════════════════════════
    # MX — seev.033 (Corporate Action Instruction)
    # ═══════════════════════════════════════════════════════════════
    ('MX','seev.033','MsgId','Message Identification','CA instruction ID','REFERENCE',True,35,'',''),
    ('MX','seev.033','CorpActnGnlInf/CorpActnEvtId','Event ID','Referenced CA event','REFERENCE',True,35,'',''),
    ('MX','seev.033','FinInstrmId/ISIN','ISIN','Security ISIN','ISIN',True,12,'',''),
    ('MX','seev.033','CorpActnInstr/OptnNb','Option Number','Elected option number','CODE',True,3,'',''),
    ('MX','seev.033','CorpActnInstr/OptnTp','Option Type','CASH, SECU, etc.','CODE',True,4,'',''),
    ('MX','seev.033','CorpActnInstr/InstrQty/Unit','Instruction Quantity','Units to instruct','QUANTITY',True,None,'',''),
    # ═══════════════════════════════════════════════════════════════
    # BIC — Bank Identifier Codes
    # ═══════════════════════════════════════════════════════════════
    ('BIC','SWIFT-BIC','BIC8','8-char BIC','Bank code (4) + Country (2) + Location (2)','BIC',True,8,'4!a2!a2!c','DEUTDEFF'),
    ('BIC','SWIFT-BIC','BIC11','11-char BIC','BIC8 + Branch code (3)','BIC',False,11,'4!a2!a2!c3!c','DEUTDEFFXXX'),
    ('BIC','SWIFT-BIC','BANK','Bank Code','4-letter institution identifier','CODE',True,4,'4!a','DEUT'),
    ('BIC','SWIFT-BIC','CTRY','Country Code','ISO 3166-1 alpha-2 country code','CODE',True,2,'2!a','DE'),
    ('BIC','SWIFT-BIC','LOC','Location Code','2-char city/location identifier','CODE',True,2,'2!c','FF'),
    ('BIC','SWIFT-BIC','BRNCH','Branch Code','3-char branch identifier (XXX = head office)','CODE',False,3,'3!c','XXX'),
    ('BIC','SWIFT-BIC','LEI','Legal Entity Identifier','20-char LEI for sanctions/compliance','TEXT',False,20,'18!c2!n','529900HNOAA1KXQJUH90'),
    # ═══════════════════════════════════════════════════════════════
    # BIC — Malaysian Bank BIC Codes (Examples)
    # ═══════════════════════════════════════════════════════════════
    ('BIC','MY','MBBEMYKL','Maybank (Malayan Banking Berhad)','SWIFT/BIC code for Maybank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','MBBEMYKL'),
    ('BIC','MY','CIBBMYKL','CIMB Bank Berhad','SWIFT/BIC code for CIMB Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','CIBBMYKL'),
    ('BIC','MY','PBBEMYKL','Public Bank Berhad','SWIFT/BIC code for Public Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','PBBEMYKL'),
    ('BIC','MY','RHBBMYKL','RHB Bank Berhad','SWIFT/BIC code for RHB Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','RHBBMYKL'),
    ('BIC','MY','HLBBMYKL','Hong Leong Bank Berhad','SWIFT/BIC code for Hong Leong Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','HLBBMYKL'),
    ('BIC','MY','PHBMMYKL','Affin Bank Berhad','SWIFT/BIC code for Affin Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','PHBMMYKL'),
    ('BIC','MY','MFBBMYKL','Alliance Bank Malaysia Berhad','SWIFT/BIC code for Alliance Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','MFBBMYKL'),
    ('BIC','MY','ARBKMYKL','AmBank (M) Berhad','SWIFT/BIC code for AmBank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','ARBKMYKL'),
    ('BIC','MY','BIMBMYKL','Bank Islam Malaysia Berhad','SWIFT/BIC code for Bank Islam, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','BIMBMYKL'),
    ('BIC','MY','BKRMMYKL','Bank Kerjasama Rakyat Malaysia Berhad','SWIFT/BIC code for Bank Rakyat, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','BKRMMYKL'),
    ('BIC','MY','BMMBMYKL','Bank Muamalat Malaysia Berhad','SWIFT/BIC code for Bank Muamalat, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','BMMBMYKL'),
    ('BIC','MY','BNMAMYKL','Bank Negara Malaysia','SWIFT/BIC code for Bank Negara Malaysia (Central Bank)','BIC',False,11,'4!a2!a2!c[3!c]','BNMAMYKL'),
    ('BIC','MY','BSNAMYK1','Bank Simpanan Nasional (BSN)','SWIFT/BIC code for BSN, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','BSNAMYK1'),
    ('BIC','MY','CITIMYKL','Citibank Berhad','SWIFT/BIC code for Citibank Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','CITIMYKL'),
    ('BIC','MY','DEUTMYKL','Deutsche Bank (Malaysia) Berhad','SWIFT/BIC code for Deutsche Bank Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','DEUTMYKL'),
    ('BIC','MY','HLIBMYKL','Hong Leong Islamic Bank Berhad','SWIFT/BIC code for Hong Leong Islamic, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','HLIBMYKL'),
    ('BIC','MY','HBMBMYKL','HSBC Bank Malaysia Berhad','SWIFT/BIC code for HSBC Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','HBMBMYKL'),
    ('BIC','MY','ICBKMYKL','Industrial and Commercial Bank of China (Malaysia) Berhad','SWIFT/BIC code for ICBC Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','ICBKMYKL'),
    ('BIC','MY','OCBCMYKL','OCBC Bank (Malaysia) Berhad','SWIFT/BIC code for OCBC Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','OCBCMYKL'),
    ('BIC','MY','SCBLMYKL','Standard Chartered Bank Malaysia Berhad','SWIFT/BIC code for StanChart Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','SCBLMYKL'),
    ('BIC','MY','UOBMMYKL','United Overseas Bank (Malaysia) Berhad','SWIFT/BIC code for UOB Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','UOBMMYKL'),
    ('BIC','MY','CIABORJM','CIMB Islamic Bank Berhad','SWIFT/BIC code for CIMB Islamic, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','CIABORJM'),
    ('BIC','MY','AGOBMYKL','Agrobank (Bank Pertanian Malaysia Berhad)','SWIFT/BIC code for Agrobank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','AGOBMYKL'),
    ('BIC','MY','BPMBMYKL','Bank Pembangunan Malaysia Berhad','SWIFT/BIC code for Bank Pembangunan, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','BPMBMYKL'),
    ('BIC','MY','EXMBMYKL','Export-Import Bank of Malaysia Berhad','SWIFT/BIC code for EXIM Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','EXMBMYKL'),
    ('BIC','MY','KABORJM1','Kuwait Finance House (Malaysia) Berhad','SWIFT/BIC code for KFH Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','KABORJM1'),
    ('BIC','MY','MBISMYKL','MBSB Bank Berhad','SWIFT/BIC code for MBSB Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','MBISMYKL'),
    ('BIC','MY','AMTBMYKL','Amanahraya Trustees Berhad','SWIFT/BIC code for Amanahraya Trustees, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','AMTBMYKL'),
    ('BIC','MY','AIABORJM','Alliance Islamic Bank Berhad','SWIFT/BIC code for Alliance Islamic, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','AIABORJM'),
    ('BIC','MY','AABORJM1','Affin Islamic Bank Berhad','SWIFT/BIC code for Affin Islamic, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','AABORJM1'),
    ('BIC','MY','RHBAISBA','RHB Islamic Bank Berhad','SWIFT/BIC code for RHB Islamic, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','RHBAISBA'),
    ('BIC','MY','MABORJM1','Maybank Islamic Berhad','SWIFT/BIC code for Maybank Islamic, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','MABORJM1'),
    ('BIC','MY','PIBEMYKL','Public Islamic Bank Berhad','SWIFT/BIC code for Public Islamic Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','PIBEMYKL'),
    ('BIC','MY','CHASMYKL','JP Morgan Chase Bank Berhad','SWIFT/BIC code for JP Morgan Chase Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','CHASMYKL'),
    ('BIC','MY','BNINMYKL','Bank of China (Malaysia) Berhad','SWIFT/BIC code for Bank of China Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','BNINMYKL'),
    ('BIC','MY','BOTKMYKL','MUFG Bank (Malaysia) Berhad','SWIFT/BIC code for MUFG Bank Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','BOTKMYKL'),
    ('BIC','MY','SABORJM1','Sabah Development Bank Berhad','SWIFT/BIC code for Sabah Development Bank, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','SABORJM1'),
    ('BIC','MY','HABORJM1','HSBC Amanah Malaysia Berhad','SWIFT/BIC code for HSBC Amanah, Malaysia','BIC',False,11,'4!a2!a2!c[3!c]','HABORJM1'),
    # ═══════════════════════════════════════════════════════════════
    # GENERAL — Trade & Settlement Parameters
    # ═══════════════════════════════════════════════════════════════
    ('GENERAL','Securities','TRAD_DT','Trade Date','Date the trade was executed','DATE',True,10,'YYYY-MM-DD','2025-03-15'),
    ('GENERAL','Securities','SETT_DT','Settlement Date','Date securities/cash are exchanged (T+1, T+2, etc.)','DATE',True,10,'YYYY-MM-DD','2025-03-17'),
    ('GENERAL','Securities','ISIN','ISIN Code','12-character International Securities Identification Number','ISIN',True,12,'2!a9!c1!n','US0378331005'),
    ('GENERAL','Securities','SEDOL','SEDOL Code','7-character Stock Exchange Daily Official List code','TEXT',False,7,'',''),
    ('GENERAL','Securities','CUSIP','CUSIP Code','9-character Committee on Uniform Securities ID','TEXT',False,9,'','037833100'),
    ('GENERAL','Securities','CCY','Currency Code','ISO 4217 currency code','CURRENCY',True,3,'3!a','USD'),
    ('GENERAL','Securities','QTY','Quantity','Number of securities units or face amount','QUANTITY',True,None,'','1000'),
    ('GENERAL','Securities','PRC','Price','Price per unit or percentage of face value','RATE',True,None,'','150.25'),
    ('GENERAL','Securities','CTPY','Counterparty','Counterparty BIC or name','TEXT',True,None,'','JPMORGAN CHASE'),
    ('GENERAL','Securities','CTPY_BIC','Counterparty BIC','BIC code of counterparty','BIC',False,11,'','CHASUS33XXX'),
    ('GENERAL','Securities','POOL','Pool Reference','Common reference for matching trades','REFERENCE',False,16,'',''),
    ('GENERAL','Securities','DEAL','Deal Reference','Internal deal/trade reference number','REFERENCE',True,16,'',''),
    ('GENERAL','FX','FX_PAIR','Currency Pair','Currency pair traded e.g. EUR/USD','TEXT',True,7,'3!a/3!a','EUR/USD'),
    ('GENERAL','FX','DEAL_RT','Deal Rate','Agreed exchange rate','RATE',True,None,'','1.08975'),
    ('GENERAL','FX','BUY_CCY','Buy Currency','Currency being purchased','CURRENCY',True,3,'','USD'),
    ('GENERAL','FX','BUY_AMT','Buy Amount','Amount of buy currency','AMOUNT',True,None,'','1000000'),
    ('GENERAL','FX','SELL_CCY','Sell Currency','Currency being sold','CURRENCY',True,3,'','EUR'),
    ('GENERAL','FX','SELL_AMT','Sell Amount','Amount of sell currency','AMOUNT',True,None,'','918000'),
    ('GENERAL','FX','FX_TYPE','Deal Type','SPOT, FWD, SWAP, NDF','CODE',True,4,'','SPOT'),
    ('GENERAL','Money Market','MM_TYPE','Deal Type','DEPOSIT, LOAN, CALL, REPO','CODE',True,10,'','DEPOSIT'),
    ('GENERAL','Money Market','MM_RATE','Interest Rate','Annualized interest rate in percentage','RATE',True,None,'','3.750'),
    ('GENERAL','Money Market','MM_DAYS','Day Count','Number of days for interest calculation','TEXT',True,None,'','90'),
    ('GENERAL','Money Market','MM_BASIS','Day Count Basis','ACT/360, ACT/365, 30/360','CODE',True,7,'','ACT/360'),
    ('GENERAL','Money Market','PRINCIPAL','Principal Amount','Nominal/face amount of the deal','AMOUNT',True,None,'','5000000'),
    ('GENERAL','Money Market','INT_AMT','Interest Amount','Calculated interest amount','AMOUNT',False,None,'','46875'),
    ('GENERAL','Money Market','MAT_DT','Maturity Date','Date the deal matures','DATE',True,10,'','2025-06-13'),
    # ═══════════════════════════════════════════════════════════════
    # GENERAL — Common / Cross-cutting Parameters
    # ═══════════════════════════════════════════════════════════════
    ('GENERAL','Header','BLOCK1','Basic Header Block','F/A + LT address + session/sequence','TEXT',True,None,'{1:F01BANKBICXAXXX0000000000}',''),
    ('GENERAL','Header','BLOCK2','Application Header','I/O + MT type + receiver BIC + priority','TEXT',True,None,'{2:I103BANKBICXAXXXN}',''),
    ('GENERAL','Header','BLOCK3','User Header Block','Optional banking priority, MUR, UETR','TEXT',False,None,'',''),
    ('GENERAL','Header','BLOCK4','Text Block','Message body containing field tags','TEXT',True,None,'',''),
    ('GENERAL','Header','BLOCK5','Trailer Block','MAC, CHK, authentication/validation','TEXT',False,None,'',''),
    ('GENERAL','Compliance','UETR','Unique E2E Transaction Ref','UUID v4 mandatory for gpi tracking since Nov 2018','REFERENCE',True,36,'','eb6305c9-1f7a-4c87-bb44-0471e8c8e5f4'),
    ('GENERAL','Compliance','SNCT_SCR','Sanctions Screening','All messages screened against 30+ sanction lists (OFAC, EU, UN, etc.)','CODE',True,None,'','PASS'),
    ('GENERAL','Compliance','ADDR_STRUCT','Structured Address','Mandatory from Nov 2025: TwnNm + Ctry required for Dbtr/Cdtr','TEXT',True,None,'',''),
    ('GENERAL','Compliance','ISO20022_MIG','ISO 20022 Migration','MT coexistence ends Nov 2025. MT→MX: MT103→pacs.008, MT202→pacs.009, MT940→camt.053','TEXT',True,None,'',''),
    ('GENERAL','Compliance','CSCF_V2025','CSCF v2025 Controls','Customer Security Programme mandatory controls for attestation','TEXT',True,None,'',''),
    ('GENERAL','ISO 4217','CCY_CODE','Currency Code','3-character ISO 4217 currency code','CURRENCY',True,3,'3!a','MYR'),
    ('GENERAL','ISO 3166','CTRY_CODE','Country Code','2-character ISO 3166-1 alpha-2 country code','CODE',True,2,'2!a','MY'),
    ('GENERAL','Format','FMT_n','Numeric Only','Digits 0-9 only. Prefix: ! = fixed length','TEXT',False,None,'',''),
    ('GENERAL','Format','FMT_a','Alpha Only','Letters A-Z only','TEXT',False,None,'',''),
    ('GENERAL','Format','FMT_c','Alphanumeric','Letters + digits','TEXT',False,None,'',''),
    ('GENERAL','Format','FMT_d','Decimal','Digits with comma as decimal separator','TEXT',False,None,'',''),
    ('GENERAL','Format','FMT_x','SWIFT Character Set','All allowed SWIFT characters including special chars','TEXT',False,None,'',''),
]
# fmt: on

FIELDS = ['category','message_type','field_tag','field_name','description','data_type','is_mandatory','max_length','format_pattern','sample_value']


class Command(BaseCommand):
    help = 'Seed comprehensive SWIFT parameters (MT, MX, BIC, GENERAL)'

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for row in PARAMS:
            cat, msg, tag, name, desc, dtype, mandatory, maxlen, fmt, sample = row
            obj, was_created = SwiftParameter.objects.update_or_create(
                category=cat,
                message_type=msg,
                field_tag=tag,
                defaults={
                    'field_name': name,
                    'description': desc,
                    'data_type': dtype,
                    'is_mandatory': mandatory,
                    'max_length': maxlen,
                    'format_pattern': fmt,
                    'sample_value': sample,
                    'status': 'active',
                }
            )
            if was_created:
                created += 1
            else:
                updated += 1

        total = SwiftParameter.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'Done: {created} created, {updated} updated. Total: {total} parameters.'
        ))

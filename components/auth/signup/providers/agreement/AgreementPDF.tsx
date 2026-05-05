/* eslint-disable react/no-unescaped-entities */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    lineHeight: 1.5,
  },
  logo: {
    width: 150,
    height: 50,
    marginBottom: 20,
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  paragraph: {
    marginBottom: 8,
  },
  bold: {
    fontWeight: "bold",
  },
  indent: {
    marginLeft: 20,
  },
  signatureSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f9f9f9",
    border: "1px solid #e0e0e0",
  },
  signatureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureColumn: {
    width: "48%",
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 10,
    padding: 6,
    height: 28,
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 4,
  },
  signatureImage: {
    width: "100%",
    height: 60,
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 4,
    objectFit: "contain",
  },
  pageBreak: {
    marginTop: 20,
    marginBottom: 20,
    borderBottom: "1px solid #e0e0e0",
  },
  inputPlaceholder: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: 4,
    fontSize: 9,
  },
});

interface AgreementPDFProps {
  coveredEntity: string;
  coveredEntityName: string;
  coveredEntitySignature: string;
  coveredEntityTitle: string;
  coveredEntityDate: string;
  businessAssociateName?: string;
  businessAssociateSignature?: string;
  businessAssociateTitle?: string;
  businessAssociateDate?: string;
}

const UNDERLINE_PLACEHOLDER = "\u00A0".repeat(44);

const AgreementPDF = ({
  coveredEntity,
  coveredEntityName,
  coveredEntitySignature,
  coveredEntityTitle,
  coveredEntityDate,
  businessAssociateName,
  businessAssociateSignature,
  businessAssociateTitle,
  businessAssociateDate,
}: AgreementPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Logo - Using placeholder text since we need to handle image properly */}
      <Text style={styles.title}>DERMA ROUTE</Text>
      <Text style={styles.title}>BUSINESS ASSOCIATE AGREEMENT</Text>

      {/* Page 1 Content */}
      <View style={styles.section}>
        <Text style={styles.paragraph}>
          This Business Associate Agreement (the "Agreement"), is hereby made by
          and between{" "}
          <Text style={{ textDecoration: "underline", fontSize: 10 }}>
            {coveredEntity?.trim() ? coveredEntity : UNDERLINE_PLACEHOLDER}
          </Text>
        </Text>
        <View style={{ marginTop: 6, marginBottom: 4 }}>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#000",
              width: "82%",
            }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: -10,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                lineHeight: 1.1,
                backgroundColor: "#ffffff",
                paddingLeft: 4,
              }}
            >
              ("Covered Entity") and
            </Text>
          </View>
        </View>
        <Text style={styles.paragraph}>
          Derma Route ("Business Associate"), each individually a
          "Party" and together the "Parties."
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>A.</Text> The purpose of this Agreement is
          to comply with the business associate requirements of the Standards
          for Privacy of Individually Identifiable Health Information ("Privacy
          Regulations," 45 CFR Part 160, 162, and 164, Subparts A and E), the
          Standards for Security of Electronic Protected Health Information
          ("Security Regulations", 45 CFR Parts 160, 162, and 164, Subpart C)
          (collectively referred to as "HIPAA Regulations"), contained in the
          Health Insurance Portability and Accountability Act of 1996 ("HIPAA")
          (45 C.F.R. parts 160 and 164), as amended by the Health Information
          Technology for Economic and Clinical Health Act ("HITECH").
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>B.</Text> Covered Entity and Business
          Associate have entered into this Agreement because Business Associate
          may receive and/or create certain Protected Health Information
          ("PHI"), as that term is defined or certain services (the "Services")
          for Covered Entity, such as consultation, eligibility determination,
          or other activities related to the medical devices, supplies,
          therapeutics, and other products covered by Business Associate. For
          clarity, the Services do not include conducting insurance checks,
          precertifications, appeals, grievances, or any insurance-related
          activities on behalf of Covered Entity or patients.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>C.</Text> The Privacy Regulations require
          Covered Entity to obtain written assurances from Business Associate
          that Business Associate will appropriately safeguard the PHI.
        </Text>
        <Text style={styles.paragraph}>
          Now, therefore, in consideration of the mutual promises set forth
          below and other good and valuable consideration, the sufficiency and
          receipt of which is hereby acknowledged, the Parties agree as follows:
        </Text>
      </View>
    </Page>

    {/* Page 2 Content */}
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={[styles.paragraph, styles.bold]}>Definitions.</Text>
        <Text style={styles.paragraph}>
          Terms used, but not otherwise defined, in this Agreement shall have
          the same meaning as in the HIPAA Regulations.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          General Use and Disclosure, and Obligations of Business Associate.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.1</Text> Business Associate hereby
          acknowledges and agrees that it will comply with the requirements
          applicable to Business Associate found in the HIPAA regulations and in
          the HITECH Act commencing on the applicable effective date of each
          such provision and that such requirements are incorporated by
          reference into this Agreement.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.2</Text> Business Associate agrees to
          implement appropriate federal and state security and privacy laws
          which may be applicable to PHI provided to Business Associate by
          Covered Entity to the extent such laws are more protective of
          individual privacy than HIPAA.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.3</Text> Business Associate may use or
          disclose PHI on Covered Entity's behalf or for, or on behalf of
          Covered Entity as specified in the Privacy Regulations, this Business
          Associate Agreement and any underlying Agreements between the parties
          or as otherwise required by Business Associate under the Privacy
          Regulations or applicable law, provided that Business Associate shall
          not make any use or disclosure of PHI that would violate the Privacy
          Regulations if disclosed or used in such a manner by Covered Entity.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.4</Text> Inconsistent with Covered
          Entity's obligations under the Privacy Regulations or (ii) that would
          violate the Privacy Regulations if disclosed or used in such a manner
          by Covered Entity.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          Safeguards for the Protection of PHI.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>3.1</Text> Business Associate shall
          implement and maintain commercially appropriate security safeguards to
          ensure that PHI is not used or disclosed by Business Associate, its
          employees, agents, or subcontractors in violation of this Agreement.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>3.2</Text> Business Associate agrees to
          implement appropriate physical and technical safeguards that
          reasonably and appropriately protect the confidentiality, integrity,
          and availability of any electronic PHI that is created, received,
          maintained or transmitted by Business Associate under this Agreement.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          Reporting and Mitigating the Effect of Unauthorized Uses and
          Disclosures.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>4.1</Text> Business Associate agrees to
          promptly report in writing to Covered Entity's Privacy Officer any use
          or disclosure of PHI not provided for by this Agreement of which it
          becomes aware.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>4.2</Text> Business Associate agrees to
          mitigate, to the extent practicable, any harmful effect that is known
          to Business Associate of a use or disclosure of PHI by Business
          Associate in violation.
        </Text>
      </View>
    </Page>

    {/* Page 3 Content */}
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.paragraph}>
          of the requirements of this Agreement.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>4.3</Text> If Business Associate creates,
          receives, maintains or transmits electronic PHI on Covered Entity's
          behalf, Business Associate will report to Covered Entity within
          forty-eight (48) hours any security accident of which it becomes
          aware. A "security accident" means the attempted or successful
          unauthorized access, use, disclosure, modification, or destruction of
          information or interference with system operations in an information
          system.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>4.4</Text> Business Associate agrees to
          notify Covered Entity of any breach of unsecured PHI as defined under
          45 CFR §164.402 in an expedited manner and in no case later than
          thirty (30) days after discovery of the breach. Business Associate's
          notice to Covered Entity shall include all information required for
          Covered Entity to provide notification required under 45 CFR §164.404.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>4.5</Text> At the option of Covered Entity,
          Business Associate shall make any notifications required under 45 CFR
          164.404 in accordance with a process satisfactory to Covered Entity.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>5.1</Text> Business Associate will require
          any subcontractor, agent, or other representative that is authorized
          to receive, use, or have access to PHI under this Agreement, to agree
          in writing to abide by the same restrictions and conditions on the use
          and/or disclosure of PHI and to return or destroy any PHI to Business
          Associate under this Agreement (the "Sub-contractor Agreements").
          Business Associate shall include in each Sub-contractor Agreement an
          agreement that states that upon Covered Entity is a third-party
          beneficiary of the Sub-contractor Agreement.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>5.2</Text> If applicable, Business Associate
          will require any subcontractor, agent, or other representative to whom
          Business Associate provides electronic PHI from or on behalf of
          Covered Entity to comply with the same restrictions and conditions
          that apply to Business Associate with respect to such information and
          appropriate safeguards to protect the electronic PHI.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          Individual Rights and Accounting of Disclosures.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>6.1</Text> Access by or to Covered Entity.
          Business Associate shall:
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          (i) make available PHI to the individual in accordance with 45 C.F.R.
          Section 164.524 and
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          (ii) incorporate any amendments to the PHI.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>6.2</Text> Business Associate shall document
          all disclosures of PHI and any information related to such disclosures
          as would be required for Covered Entity to respond to a request by an
          individual for an accounting of disclosures of PHI in accordance with
          the Privacy.
        </Text>
      </View>
    </Page>

    {/* Page 4 Content */}
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.paragraph}>Regulations.</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>6.3</Text> Business Associate agrees to
          provide to Covered Entity, in a time and manner designated by Covered
          Entity, information collected in accordance with Section 6.2, to
          permit Covered Entity to respond to a request by an individual for an
          accounting of disclosures of PHI in accordance with the Privacy
          Regulations.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          7. Audit, Inspection and Enforcement.
        </Text>
        <Text style={styles.paragraph}>
          With reasonable notice, Business Associate agrees to make internal
          practices, books and records, including policies and procedures
          relating to the use and disclosure of PHI received from, or created or
          received by Business Associate on behalf of Covered Entity, available
          to the Covered Entity and the Secretary of the Department of Health
          and Human Services to monitor compliance with the Privacy Regulations.
          Business Associate must provide any information regarding Business
          Associate and promptly cooperate with inspections, reviews, or
          investigations of this Agreement found by Covered Entity, according to
          Covered Entity's guidelines; and will review any corrections that may
          be made.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          Obligations of Covered Entity to Inform Business Associate of Privacy
          Practices and Restrictions.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>8.1</Text> Covered Entity shall provide
          Business Associate with its Notice of Privacy Practices in accordance
          with the Privacy Regulations, as well as any changes to such Notice.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>8.2</Text> Covered Entity shall notify
          Business Associate of any changes in, or revocation of, any
          authorization to use or disclose PHI, to the extent it may affect
          Business Associate's permitted or required uses and disclosures.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>8.3</Text> Covered Entity shall notify
          Business Associate of any restrictions to the use or disclosure of PHI
          that Covered Entity has agreed to in accordance with the Privacy
          Regulations, if the restriction affects Business Associate's permitted
          or required uses and disclosures.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          9. Term and Termination.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>9.1</Text> Term. This Agreement shall
          terminate upon termination of Services by Business Associate to
          Covered Entity or as otherwise provided in this Agreement.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>9.2</Text> Termination for Cause. If either
          Party is determined to have materially breached the HIPAA Regulations
          or this Agreement, the non-breaching party may terminate the Agreement
          immediately upon written notice.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>9.3</Text> Effect of Termination. Upon
          termination of the Agreement, for any reason, Business Associate
          shall, within five (5) business days of the termination, return or
          destroy all PHI as.
        </Text>
      </View>
    </Page>

    {/* Page 5 Content */}
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.paragraph}>
          directed by Covered Entity, created or received by Business Associate
          on behalf of Covered Entity. PHI retention shall only apply to the
          agents or subcontractors of Business Associate.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>9.4</Text> In the event that Business
          Associate cannot return or destroy the PHI, Business Associate shall
          notify Covered Entity of the conditions that make such return or
          destruction impossible. Business Associate shall extend the
          protections of this Agreement to such PHI and limit further uses and
          disclosures of such PHI to those purposes that make the return or
          destruction infeasible for so long as Business Associate maintains
          such Protected Health Information.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>10. Miscellaneous.</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.1</Text> Regulatory References. A
          reference in this Agreement to the Privacy Regulations, Security
          Regulations or HIPAA Regulations means the form of such regulations
          are in effect or as amended.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.2</Text> Amendment. If any modifications
          to this Agreement are required by law, Covered Entity shall notify
          Business Associate of proposed modifications to the Agreement to
          comply with changes in law and give the parties a reasonable
          opportunity to deliver such amendments acceptable to Covered Entity.
          Such Notice shall include modifications to the business associate and
          the Agreement as amended if Business Associate does not within 30 days
          following the date of the notice, deliver to Covered Entity its
          written rejection of such modifications.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.3</Text> Waiver. Absent a written
          agreement signed by the Parties, a waiver of a breach of this
          Agreement shall not be construed as a waiver of a breach of any other
          provision of this Agreement, or of a future waiver of any subsequent
          breach of the same provision.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.4</Text> No Third Party Beneficiaries.
          Except as it relates to the Sub-contractor Agreements, above, nothing
          in this Agreement is intended to confer, upon any person other than
          the Parties and the respective successors and permitted assigns of the
          Parties, any rights, remedies, obligations, or liabilities whatsoever.
          The Agreement shall only be assigned or transferred by Business
          Associate, in whole or part, without prior written consent of Covered
          Entity.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.5</Text> Notices. Any notice to be given
          under this Agreement to a Party shall be made via Certified U.S. Mail,
          return receipt requested, commercial courier with receipt
          verification, or.
        </Text>
      </View>
    </Page>

    {/* Page 6 Content with Signature */}
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.paragraph}>
          by hand delivery to such Party at its address given below or to such
          other address as shall be specified by the applicable party in the
          future:
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          <Text style={styles.bold}>to Business Associate:</Text>
          {"\n"}
          Derma Route, Attn: Privacy Officer
          {"\n"}
          10 Hwy 98 STE 315 PMB#38 Bonaire, GA 31005
        </Text>
        <Text style={[styles.paragraph, styles.indent]}>
          <Text style={styles.bold}>to Covered Entity:</Text>
          {"\n"}
          <Text style={styles.inputPlaceholder}>{coveredEntity}</Text>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.6</Text> Entire Agreement. This Agreement
          constitutes the entire understanding among the parties with respect to
          this subject matter.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.7</Text> Interpretation. Any ambiguity in
          this Agreement shall be resolved to permit Covered Entity to comply
          with the HIPAA Regulations.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10.8</Text> Choice of Law and Venue. This
          Agreement shall be governed by the laws of the State of Georgia,
          without regard to any statute or case law on choice of laws. Venue for
          any legal action brought under this Agreement shall be brought
          exclusively in the United States District Court for the Middle
          District of Georgia.
        </Text>
        <Text style={[styles.paragraph, styles.bold]}>
          WITNESS WHEREOF, each of the parties has caused this Agreement to be
          executed in its name and on its behalf:
        </Text>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureGrid}>
            {/* Covered Entity Column */}
            <View style={styles.signatureColumn}>
              <Text style={[styles.paragraph, styles.bold]}>
                Covered Entity:
              </Text>
              <Text style={styles.fieldLabel}>Organization/Clinic Name</Text>
              <Text style={styles.fieldValue}>{coveredEntity}</Text>

              <Text style={styles.fieldLabel}>Name (Printed)</Text>
              <Text style={styles.fieldValue}>{coveredEntityName}</Text>

              <Text style={styles.fieldLabel}>Signature</Text>
              <View
                style={[
                  styles.signatureImage,
                  { justifyContent: "center", alignItems: "center" },
                ]}
              >
                {coveredEntitySignature ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    src={coveredEntitySignature}
                    style={{ width: "100%", height: 60, objectFit: "contain" }}
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontStyle: "italic",
                      color: "#b0b0b0",
                    }}
                  >
                    {/* Empty signature box */}
                  </Text>
                )}
              </View>

              <Text style={styles.fieldLabel}>Title</Text>
              <Text style={styles.fieldValue}>{coveredEntityTitle}</Text>

              <Text style={styles.fieldLabel}>Date</Text>
              <Text style={styles.fieldValue}>{coveredEntityDate}</Text>
            </View>

            {/* Business Associate Column */}
            <View style={styles.signatureColumn}>
              <Text style={[styles.paragraph, styles.bold]}>
                Derma Route:
              </Text>
              <Text style={styles.fieldLabel}>By</Text>
              <Text style={styles.fieldValue}>
                {businessAssociateName ?? ""}
              </Text>

              <Text style={styles.fieldLabel}>Signature</Text>
              <View
                style={[
                  styles.signatureImage,
                  { justifyContent: "center", alignItems: "center" },
                ]}
              >
                {businessAssociateSignature ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    src={businessAssociateSignature}
                    style={{ width: "100%", height: 60, objectFit: "contain" }}
                  />
                ) : (
                  <Text style={{ fontSize: 16, fontStyle: "italic" }}></Text>
                )}
              </View>

              <Text style={styles.fieldLabel}>Title</Text>
              <Text style={styles.fieldValue}>
                {businessAssociateTitle ?? ""}
              </Text>

              <Text style={styles.fieldLabel}>Date</Text>
              <Text style={styles.fieldValue}>
                {businessAssociateDate ??
                  new Date().toLocaleDateString("en-US", {
                    timeZone: "America/New_York",
                  })}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export default AgreementPDF;

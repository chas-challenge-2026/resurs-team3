package se.comerit.resurs.dto;

import java.math.BigDecimal;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Positive;
import javax.validation.constraints.PositiveOrZero;

public class CreateApplicationRequest {

    @NotBlank(message = "Organisationsnummer krävs")
    private String orgNumber;

    @NotBlank(message = "Företagsnamn krävs")
    private String companyName;

    @NotBlank(message = "Firmatecknare krävs")
    private String authorizedSignatory;

    @PositiveOrZero(message = "Eget kapital får inte vara negativt")
    private double egetKapital;

    @Positive(message = "Totalt kapital måste vara större än 0")
    private double totaltKapital;

    @PositiveOrZero(message = "Omsättningstillgångar får inte vara negativa")
    private double omsattningstillgangar;

    @PositiveOrZero(message = "Kortfristiga skulder får inte vara negativa")
    private double kortfristigaSkulder;

    @PositiveOrZero(message = "Totala skulder får inte vara negativa")
    private double totalaSkulder;

    private double rorelseresultat;


    private double nettoomsattning;

    @NotNull(message = "Ansökt belopp krävs")
    @Positive(message = "Ansökt belopp måste vara större än 0")
    private BigDecimal requestedAmount;

    @NotBlank(message = "Syfte krävs")
    private String purpose;

    private double operativtKassaflode;

    private double investeringsKassaflode;

    @PositiveOrZero(message = "Räntekostnader får inte vara negativa")
    private double ranteKostnader;

    private String bransch;


    public String getOrgNumber() {
        return orgNumber;
    }

    public void setOrgNumber(String orgNumber) {
        this.orgNumber = orgNumber;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getAuthorizedSignatory() {
        return authorizedSignatory;
    }

    public void setAuthorizedSignatory(String authorizedSignatory) {
        this.authorizedSignatory = authorizedSignatory;
    }

    public double getEgetKapital() {
        return egetKapital;
    }

    public void setEgetKapital(double egetKapital) {
        this.egetKapital = egetKapital;
    }

    public double getTotaltKapital() {
        return totaltKapital;
    }

    public void setTotaltKapital(double totaltKapital) {
        this.totaltKapital = totaltKapital;
    }

    public double getOmsattningstillgangar() {
        return omsattningstillgangar;
    }

    public void setOmsattningstillgangar(double omsattningstillgangar) {
        this.omsattningstillgangar = omsattningstillgangar;
    }

    public double getKortfristigaSkulder() {
        return kortfristigaSkulder;
    }

    public void setKortfristigaSkulder(double kortfristigaSkulder) {
        this.kortfristigaSkulder = kortfristigaSkulder;
    }

    public double getTotalaSkulder() {
        return totalaSkulder;
    }

    public void setTotalaSkulder(double totalaSkulder) {
        this.totalaSkulder = totalaSkulder;
    }

    public double getRorelsesresultat() {
        return rorelseresultat;
    }

    public void setRorelsesresultat(double rorelseresultat) {
        this.rorelseresultat = rorelseresultat;
    }

    public double getNettoomsattning() {
        return nettoomsattning;
    }

    public void setNettoomsattning(double nettoomsattning) {
        this.nettoomsattning = nettoomsattning;
    }

    public BigDecimal getRequestedAmount() {
        return requestedAmount;
    }

    public void setRequestedAmount(BigDecimal requestedAmount) {
        this.requestedAmount = requestedAmount;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose;
    }

    public double getOperativtKassaflode() {
        return operativtKassaflode;
    }

    public void setOperativtKassaflode(double operativtKassaflode) {
        this.operativtKassaflode = operativtKassaflode;
    }

    public double getInvesteringsKassaflode() {
        return investeringsKassaflode;
    }

    public void setInvesteringsKassaflode(double investeringsKassaflode) {
        this.investeringsKassaflode = investeringsKassaflode;
    }

    public double getRanteKostnader() {
        return ranteKostnader;
    }

    public void setRanteKostnader(double ranteKostnader) {
        this.ranteKostnader = ranteKostnader;
    }

    public String getBransch() {
        return bransch;
    }

    public void setBransch(String bransch) {
        this.bransch = bransch;
    }
}
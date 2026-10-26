
package se.comerit.resurs.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;


public class CreateApplicationRequest {



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

    private Double operativtKassaflode;

    private Double investeringsKassaflode;
    private boolean noCashFlowStatement = false;

    @PositiveOrZero(message = "Räntekostnader får inte vara negativa")
    private double ranteKostnader;

    private String bransch;



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

    public double getRorelseresultat() {
        return rorelseresultat;
    }

    public void setRorelseresultat(double rorelseresultat) {
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

    public Double getOperativtKassaflode() {
        return operativtKassaflode;
    }

    public void setOperativtKassaflode(Double operativtKassaflode) {
        this.operativtKassaflode = operativtKassaflode;
    }

    public Double getInvesteringsKassaflode() {
        return investeringsKassaflode;
    }

    public void setInvesteringsKassaflode(Double investeringsKassaflode) {
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

    public boolean isNoCashFlowStatement() {
        return noCashFlowStatement;
    }

    public void setNoCashFlowStatement(boolean noCashFlowStatement) {
        this.noCashFlowStatement = noCashFlowStatement;
    }
}

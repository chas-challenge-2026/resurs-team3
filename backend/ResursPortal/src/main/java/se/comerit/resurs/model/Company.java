package se.comerit.resurs.model;

import javax.persistence.*;

@Entity
@Table(name = "companies")
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "org_number")
    private String orgNumber;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "authorized_signatory")
    private String authorizedSignatory;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

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
}

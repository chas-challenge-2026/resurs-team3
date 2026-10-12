
package se.comerit.resurs.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CreateApplicationRequestTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldReadNegativeRorelseresultatFromJson() throws Exception {

        String json = "{\"rorelseresultat\": -5000}";

        CreateApplicationRequest request =
                objectMapper.readValue(json, CreateApplicationRequest.class);

        assertEquals(-5000.0, request.getRorelseresultat());
    }
}

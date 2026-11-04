package se.comerit.resurs.controller;

import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import se.comerit.resurs.model.Application;
import se.comerit.resurs.model.Document;
import se.comerit.resurs.service.DocumentService;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentRestControllerTest {

    @Mock
    private DocumentService documentService;

    @InjectMocks
    private DocumentRestController controller;

    private HttpSession companySession() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute("userId")).thenReturn(1L);
        when(session.getAttribute("role")).thenReturn("company");
        when(session.getAttribute("companyId")).thenReturn(1L);
        return session;
    }

    @Test
    void shouldReturnDocumentsForOwnApplication() {
        HttpSession session = companySession();

        Application application = mock(Application.class);
        when(application.getCompanyId()).thenReturn(1L);

        when(documentService.getApplication(10L))
                .thenReturn(Optional.of(application));

        Document document = mock(Document.class);
        when(document.getId()).thenReturn(5L);
        when(document.getFilename()).thenReturn("arsredovisning.pdf");
        when(document.getDocType()).thenReturn("arsredovisning");

        when(documentService.getDocuments(10L))
                .thenReturn(List.of(document));

        List<Map<String, Object>> result = controller.getDocuments(10L, session);

        assertEquals(1, result.size());
        assertEquals("arsredovisning.pdf", result.get(0).get("filename"));
    }

    @Test
    void shouldRejectWhenNotLoggedIn() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute("userId")).thenReturn(null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getDocuments(10L, session));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verifyNoInteractions(documentService);
    }

    @Test
    void shouldRejectCaseWorkerRole() {
        HttpSession session = mock(HttpSession.class);
        when(session.getAttribute("userId")).thenReturn(1L);
        when(session.getAttribute("role")).thenReturn("caseWorker");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getDocuments(10L, session));

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        verifyNoInteractions(documentService);
    }

    @Test
    void shouldReturnNotFoundForUnknownApplication() {
        HttpSession session = companySession();

        when(documentService.getApplication(99L))
                .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getDocuments(99L, session));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    void shouldReturnNotFoundForAnotherCompanysApplication() {
        HttpSession session = companySession();

        Application application = mock(Application.class);
        when(application.getCompanyId()).thenReturn(2L);

        when(documentService.getApplication(10L))
                .thenReturn(Optional.of(application));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> controller.getDocuments(10L, session));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(documentService, never()).getDocuments(anyLong());
    }
}

;; sup
;; Smart contract to handle writing a message to the blockchain in exchange small fee in STX

;; constants
(define-constant receiver-address 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG)

;; data maps and vars
(define-data-var total-sups uint u0)
(define-map messages principal (string-utf8 500))

;; public functions
(define-read-only (get-sups)
    (var-get total-sups)
)

(define-read-only (get-message (who principal))
    (map-get? messages who)
)

(define-public (write-sup (message (string-utf8 500)) (price uint))
    (begin
        (
            try! (stx-transfer? price tx-sender receiver-address)
        )

        ;; #[allow(unchecked_data)]
        (map-set messages tx-sender message )

        (var-set total-sups (+ (var-get total-sups) u1))

        (ok "Sup written successfully")
    )
)
